from flask import Blueprint, render_template, request, jsonify, send_file
import yaml
import io
import re
from collections import OrderedDict
from datetime import datetime

# V1 blueprint (formerly DSL_1) - Real-Time Task Orchestration DSL
v1_bp = Blueprint(
    'v1', __name__,
    url_prefix='/v1',
    template_folder='templates',
    static_folder='static',
    static_url_path='/static',
)

# Store the current DSL configuration in memory
dsl_config = {}

VALID_TYPES = ['int', 'float', 'string', 'bool']
VALID_POLICIES = ['fifo', 'rr', 'other']
VALID_TICK = ['us', 'ms', 'ns', 's']


# ---------------------------------------------------------------------------
# Generic validation helpers
# ---------------------------------------------------------------------------
def validate_identifier(value):
    """Validate identifier (must start with a letter)."""
    if not value:
        return False, "Identifier cannot be empty"
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', value):
        return False, "Identifier must start with a letter and contain only letters, numbers, underscores, and hyphens"
    return True, ""


def validate_version(value):
    """Validate semantic version (e.g., 1.0.0)."""
    if not value:
        return False, "Version cannot be empty"
    if not re.match(r'^\d+\.\d+\.\d+$', value):
        return False, "Version must follow semantic versioning (e.g., 1.0.0)"
    return True, ""


def validate_image_ref(value):
    """Validate container image reference (registry/name:tag)."""
    if not value:
        return False, "Image reference cannot be empty"
    if not re.match(r'^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$', value):
        return False, "Image must follow format: repo/name:tag"
    return True, ""


def validate_int(value, field_name, minimum=None):
    """Validate integer, optionally with a minimum value."""
    try:
        num = int(value)
    except (ValueError, TypeError):
        return False, f"{field_name} must be a valid integer"
    if minimum is not None and num < minimum:
        return False, f"{field_name} must be >= {minimum}"
    return True, ""


# ---------------------------------------------------------------------------
# Step validation
# ---------------------------------------------------------------------------
def validate_global(data):
    """Validate the global + environment step."""
    errors = []

    valid, msg = validate_identifier(data.get('name', ''))
    if not valid:
        errors.append(f"Name: {msg}")

    valid, msg = validate_version(data.get('version', ''))
    if not valid:
        errors.append(f"Version: {msg}")

    env = data.get('environment', {})
    res = env.get('resources', {})
    valid, msg = validate_int(res.get('cpu_cores'), 'CPU cores', minimum=1)
    if not valid:
        errors.append(msg)
    valid, msg = validate_int(res.get('memory_max'), 'Memory max', minimum=1)
    if not valid:
        errors.append(msg)

    rt = env.get('real_time', {})
    if not rt.get('kernel'):
        errors.append("Real-time kernel is required")
    if rt.get('tick_resolution') not in VALID_TICK:
        errors.append(f"Tick resolution must be one of: {', '.join(VALID_TICK)}")

    return errors


def validate_image(data):
    """Validate the image step (base, repo, task artifacts)."""
    errors = []

    valid, msg = validate_image_ref(data.get('base', ''))
    if not valid:
        errors.append(f"Base image: {msg}")

    if not data.get('repo'):
        errors.append("Repository is required")

    image_tasks = data.get('tasks', [])
    if not isinstance(image_tasks, list) or len(image_tasks) == 0:
        errors.append("At least one task artifact is required")
        return errors

    aliases = set()
    for idx, t in enumerate(image_tasks):
        prefix = f"Artifact {idx + 1}: "
        alias = t.get('alias', '')
        valid, msg = validate_identifier(alias)
        if not valid:
            errors.append(prefix + msg)
        elif alias in aliases:
            errors.append(prefix + f"Duplicate alias '{alias}'")
        else:
            aliases.add(alias)
        if not t.get('src'):
            errors.append(prefix + "Source (src) is required")

    return errors


def validate_execution_plan(data, image_aliases=None):
    """Validate the execution-plan step."""
    errors = []
    image_aliases = image_aliases or []

    if not data.get('name'):
        errors.append("Execution plan name is required")

    valid, msg = validate_int(data.get('iterations'), 'Iterations', minimum=1)
    if not valid:
        errors.append(msg)

    plan_tasks = data.get('tasks', [])
    if not isinstance(plan_tasks, list) or len(plan_tasks) == 0:
        errors.append("At least one task is required")
        return errors

    task_ids = set()
    for idx, task in enumerate(plan_tasks):
        prefix = f"Task {idx + 1}: "

        valid, msg = validate_int(task.get('id'), 'ID', minimum=0)
        if not valid:
            errors.append(prefix + msg)
        else:
            tid = int(task['id'])
            if tid in task_ids:
                errors.append(prefix + f"Duplicate task id '{tid}'")
            else:
                task_ids.add(tid)

        image = task.get('image')
        if not image:
            errors.append(prefix + "Image alias is required")
        elif image_aliases and image not in image_aliases:
            errors.append(prefix + f"Image '{image}' is not a defined artifact alias")

        valid, msg = validate_int(task.get('start'), 'Start', minimum=0)
        if not valid:
            errors.append(prefix + msg)
        valid, msg = validate_int(task.get('deadline'), 'Deadline', minimum=0)
        if not valid:
            errors.append(prefix + msg)
        valid, msg = validate_int(task.get('cpu_affinity'), 'CPU affinity', minimum=0)
        if not valid:
            errors.append(prefix + msg)

        if task.get('policy') not in VALID_POLICIES:
            errors.append(prefix + f"Policy must be one of: {', '.join(VALID_POLICIES)}")

        valid, msg = validate_int(task.get('priority'), 'Priority', minimum=0)
        if not valid:
            errors.append(prefix + msg)

        for io_kind in ('inputs', 'outputs'):
            params = task.get(io_kind, {})
            if not isinstance(params, dict):
                continue
            for pname, pdef in params.items():
                pprefix = f"{prefix}{io_kind} '{pname}': "
                valid, msg = validate_identifier(pname)
                if not valid:
                    errors.append(pprefix + msg)
                if pdef.get('type') not in VALID_TYPES:
                    errors.append(pprefix + f"type must be one of: {', '.join(VALID_TYPES)}")

    return errors


# ---------------------------------------------------------------------------
# YAML ordered dumping (preserve key order, OrderedDict support)
# ---------------------------------------------------------------------------
class OrderedDumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, indentless=False):
        # Force block sequences ("- item") to be indented under their key
        return super().increase_indent(flow, False)


def _dict_representer(dumper, data):
    return dumper.represent_mapping(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, data.items())


OrderedDumper.add_representer(OrderedDict, _dict_representer)


class QuotedStr(str):
    """A string that must be emitted with double quotes in YAML."""
    pass


def _quoted_str_representer(dumper, data):
    return dumper.represent_scalar('tag:yaml.org,2002:str', str(data), style='"')


OrderedDumper.add_representer(QuotedStr, _quoted_str_representer)


def q(value):
    """Mark a string value so it is emitted with double quotes."""
    return QuotedStr(value) if value is not None else None


def _coerce_value(ptype, value):
    """Coerce an input value to its declared type for YAML output."""
    try:
        if ptype == 'int':
            return int(value)
        if ptype == 'float':
            return float(value)
        if ptype == 'bool':
            if isinstance(value, bool):
                return value
            return str(value).strip().lower() in ('true', '1', 'yes')
        return str(value)
    except (ValueError, TypeError):
        return value


def build_ordered_config():
    """Build an ordered representation of the DSL for YAML export."""
    ordered = OrderedDict()

    # global block
    g = dsl_config.get('global', {})
    if g:
        gblock = OrderedDict()
        gblock['name'] = q(g.get('name'))
        gblock['version'] = q(g.get('version'))
        if g.get('description'):
            gblock['description'] = q(g.get('description'))
        env = g.get('environment', {})
        if env:
            eblock = OrderedDict()
            res = env.get('resources', {})
            eblock['resources'] = OrderedDict([
                ('cpu_cores', int(res.get('cpu_cores', 0))),
                ('memory_max', int(res.get('memory_max', 0))),
            ])
            rt = env.get('real_time', {})
            eblock['real_time'] = OrderedDict([
                ('kernel', q(rt.get('kernel'))),
                ('tick_resolution', q(rt.get('tick_resolution'))),
            ])
            gblock['environment'] = eblock
        ordered['global'] = gblock

    # images block
    img = dsl_config.get('image', {})
    if img:
        iblock = OrderedDict()
        iblock['base'] = q(img.get('base'))
        iblock['repo'] = q(img.get('repo'))
        iblock['tasks'] = [
            OrderedDict([('alias', q(t.get('alias'))), ('src', q(t.get('src')))])
            for t in img.get('tasks', [])
        ]
        ordered['images'] = iblock

    # schedule block
    plan = dsl_config.get('execution-plan', {})
    if plan:
        pblock = OrderedDict()
        pblock['name'] = q(plan.get('name'))
        if plan.get('description'):
            pblock['description'] = q(plan.get('description'))
        pblock['iterations'] = int(plan.get('iterations', 1))
        tasks_out = []
        for task in plan.get('tasks', []):
            tb = OrderedDict()
            tb['id'] = int(task.get('id'))
            tb['image'] = q(task.get('image'))
            tb['start'] = int(task.get('start'))
            tb['deadline'] = int(task.get('deadline'))
            tb['cpu_affinity'] = int(task.get('cpu_affinity'))
            tb['policy'] = task.get('policy')
            tb['priority'] = int(task.get('priority'))
            tb['depends_on'] = task.get('depends_on') or []
            inputs = task.get('inputs', {})
            if inputs:
                ib = OrderedDict()
                for pname, pdef in inputs.items():
                    value = _coerce_value(pdef.get('type'), pdef.get('value'))
                    if isinstance(value, str):
                        value = QuotedStr(value)
                    ib[pname] = OrderedDict([
                        ('type', pdef.get('type')),
                        ('value', value),
                    ])
                tb['inputs'] = ib
            outputs = task.get('outputs', {})
            if outputs:
                ob = OrderedDict()
                for pname, pdef in outputs.items():
                    ob[pname] = OrderedDict([('type', pdef.get('type'))])
                tb['outputs'] = ob
            tasks_out.append(tb)
        pblock['tasks'] = tasks_out
        ordered['schedule'] = pblock

    return ordered


def _add_blank_lines(text):
    """Add blank lines between top-level blocks and between schedule tasks."""
    lines = text.split('\n')
    out = []
    for line in lines:
        is_top_level = bool(re.match(r'^[A-Za-z_][\w-]*:', line))
        is_task_item = bool(re.match(r'^\s+- id:', line))
        if is_top_level and out and out[-1].strip():
            out.append('')
        elif is_task_item and out and out[-1].strip() and not out[-1].rstrip().endswith('tasks:'):
            out.append('')
        out.append(line)
    return '\n'.join(out)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@v1_bp.route('/')
def index():
    return render_template('v1/index.html')


@v1_bp.route('/api/save_step', methods=['POST'])
def save_step():
    global dsl_config
    data = request.json
    step = data.get('step')
    step_data = data.get('data')

    errors = []
    if step == 'global':
        errors = validate_global(step_data)
        if not errors:
            dsl_config['global'] = step_data
    elif step == 'image':
        errors = validate_image(step_data)
        if not errors:
            dsl_config['image'] = step_data
    elif step == 'execution-plan':
        image_aliases = [t.get('alias') for t in dsl_config.get('image', {}).get('tasks', [])]
        errors = validate_execution_plan(step_data, image_aliases)
        if not errors:
            dsl_config['execution-plan'] = step_data
    else:
        errors = [f"Unknown step '{step}'"]

    if errors:
        return jsonify({'success': False, 'errors': errors}), 400

    return jsonify({'success': True, 'message': 'Step saved successfully'})


@v1_bp.route('/api/get_config', methods=['GET'])
def get_config():
    return jsonify(dsl_config)


@v1_bp.route('/api/download', methods=['GET'])
def download():
    yaml_content = "# Real-Time Task Orchestration DSL\n"
    yaml_content += f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    body = yaml.dump(
        build_ordered_config(),
        Dumper=OrderedDumper,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
        width=4096,
    )
    yaml_content += _add_blank_lines(body)

    bytes_io = io.BytesIO()
    bytes_io.write(yaml_content.encode('utf-8'))
    bytes_io.seek(0)

    return send_file(
        bytes_io,
        mimetype='text/yaml',
        as_attachment=True,
        download_name='mission.yaml'
    )


@v1_bp.route('/api/reset', methods=['POST'])
def reset():
    global dsl_config
    dsl_config = {}
    return jsonify({'success': True, 'message': 'Configuration reset'})
