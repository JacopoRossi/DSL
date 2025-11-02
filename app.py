from flask import Flask, render_template, request, jsonify, send_file
import yaml
import io
import re
from datetime import datetime

app = Flask(__name__)

# Store the current DSL configuration in session
dsl_config = {}

# Validation functions
def validate_identifier(value):
    """Validate identifier (alphanumeric, underscore, hyphen)"""
    if not value:
        return False, "Identifier cannot be empty"
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', value):
        return False, "Identifier must start with a letter and contain only letters, numbers, underscores, and hyphens"
    return True, ""

def validate_version(value):
    """Validate semantic version (e.g., 1.0.0)"""
    if not value:
        return False, "Version cannot be empty"
    if not re.match(r'^\d+\.\d+\.\d+$', value):
        return False, "Version must follow semantic versioning (e.g., 1.0.0)"
    return True, ""

def validate_positive_number(value, field_name):
    """Validate positive number"""
    try:
        num = int(value) if isinstance(value, str) else value
        if num < 0:
            return False, f"{field_name} must be a positive number"
        return True, ""
    except (ValueError, TypeError):
        return False, f"{field_name} must be a valid number"

def validate_priority(value):
    """Validate RT priority (1-99)"""
    try:
        num = int(value) if isinstance(value, str) else value
        if num < 1 or num > 99:
            return False, "Priority must be between 1 and 99"
        return True, ""
    except (ValueError, TypeError):
        return False, "Priority must be a valid number"

def validate_image_name(value):
    """Validate container image name"""
    if not value:
        return False, "Container image cannot be empty"
    # Basic validation for registry/name:tag format
    if not re.match(r'^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$', value):
        return False, "Container image must follow format: registry/name:tag"
    return True, ""

def validate_orchestration(data):
    """Validate orchestration step data"""
    errors = []
    
    if 'name' in data:
        valid, msg = validate_identifier(data['name'])
        if not valid:
            errors.append(f"Name: {msg}")
    else:
        errors.append("Name is required")
    
    if 'version' in data:
        valid, msg = validate_version(data['version'])
        if not valid:
            errors.append(f"Version: {msg}")
    else:
        errors.append("Version is required")
    
    return errors

def validate_environment(data):
    """Validate environment step data"""
    errors = []
    
    if 'time_horizon' in data:
        th = data['time_horizon']
        if 'start' in th:
            valid, msg = validate_positive_number(th['start'], 'Time horizon start')
            if not valid:
                errors.append(msg)
        if 'end' in th:
            valid, msg = validate_positive_number(th['end'], 'Time horizon end')
            if not valid:
                errors.append(msg)
            elif 'start' in th and th['end'] <= th['start']:
                errors.append("Time horizon end must be greater than start")
    
    if 'resources' in data:
        res = data['resources']
        for field in ['cpu_cores', 'memory_max', 'bandwidth_max']:
            if field in res:
                valid, msg = validate_positive_number(res[field], field.replace('_', ' ').title())
                if not valid:
                    errors.append(msg)
    
    return errors

def validate_services(data):
    """Validate services step data"""
    errors = []
    service_ids = set()
    
    if not isinstance(data, list):
        return ["Services must be a list"]
    
    for idx, service in enumerate(data):
        prefix = f"Service {idx + 1}: "
        
        if 'id' in service:
            valid, msg = validate_identifier(service['id'])
            if not valid:
                errors.append(prefix + msg)
            elif service['id'] in service_ids:
                errors.append(prefix + f"Duplicate service ID '{service['id']}'")
            else:
                service_ids.add(service['id'])
        else:
            errors.append(prefix + "Service ID is required")
        
        if 'container' in service and 'image' in service['container']:
            valid, msg = validate_image_name(service['container']['image'])
            if not valid:
                errors.append(prefix + msg)
    
    return errors

def validate_tasks(data):
    """Validate tasks step data"""
    errors = []
    task_ids = set()
    
    if not isinstance(data, list):
        return ["Tasks must be a list"]
    
    for idx, task in enumerate(data):
        prefix = f"Task {idx + 1}: "
        
        if 'id' in task:
            valid, msg = validate_identifier(task['id'])
            if not valid:
                errors.append(prefix + msg)
            elif task['id'] in task_ids:
                errors.append(prefix + f"Duplicate task ID '{task['id']}'")
            else:
                task_ids.add(task['id'])
        else:
            errors.append(prefix + "Task ID is required")
        
        if 'service' not in task or not task['service']:
            errors.append(prefix + "Service is required")
        
        if 'real_time' in task:
            rt = task['real_time']
            if 'priority' in rt:
                valid, msg = validate_priority(rt['priority'])
                if not valid:
                    errors.append(prefix + msg)
            if 'deadline' in rt:
                valid, msg = validate_positive_number(rt['deadline'], 'Deadline')
                if not valid:
                    errors.append(prefix + msg)
    
    return errors

def validate_dependencies(data):
    """Validate dependencies step data"""
    errors = []
    
    if 'precedence' not in data:
        return errors
    
    precedence = data['precedence']
    if not isinstance(precedence, list):
        return ["Precedence must be a list"]
    
    for idx, dep in enumerate(precedence):
        prefix = f"Dependency {idx + 1}: "
        
        if 'from' not in dep or not dep['from']:
            errors.append(prefix + "'From' task is required")
        if 'to' not in dep or not dep['to']:
            errors.append(prefix + "'To' task is required")
        if 'from' in dep and 'to' in dep and dep['from'] == dep['to']:
            errors.append(prefix + "'From' and 'To' tasks cannot be the same")
    
    return errors

def validate_fault_tolerance(data):
    """Validate fault tolerance step data"""
    errors = []
    
    if 'recovery' in data:
        recovery = data['recovery']
        if 'task_failure' in recovery and 'max_retries' in recovery['task_failure']:
            valid, msg = validate_positive_number(recovery['task_failure']['max_retries'], 'Max retries')
            if not valid:
                errors.append(msg)
    
    if 'redundancy' in data and 'replicas' in data['redundancy']:
        valid, msg = validate_positive_number(data['redundancy']['replicas'], 'Replicas')
        if not valid:
            errors.append(msg)
        elif data['redundancy']['replicas'] < 1:
            errors.append("Replicas must be at least 1")
    
    return errors

@app.route('/')
def index():
    """Main page with the wizard"""
    return render_template('index.html')

@app.route('/api/save_step', methods=['POST'])
def save_step():
    """Save data from a wizard step with validation"""
    global dsl_config
    data = request.json
    step = data.get('step')
    step_data = data.get('data')
    
    # Validate data based on step
    errors = []
    if step == 'orchestration':
        errors = validate_orchestration(step_data)
        if not errors:
            dsl_config['orchestration'] = step_data
    elif step == 'environment':
        errors = validate_environment(step_data)
        if not errors:
            if 'orchestration' not in dsl_config:
                dsl_config['orchestration'] = {}
            dsl_config['orchestration']['environment'] = step_data
    elif step == 'services':
        errors = validate_services(step_data)
        if not errors:
            dsl_config['services'] = step_data
    elif step == 'tasks':
        errors = validate_tasks(step_data)
        if not errors:
            dsl_config['tasks'] = step_data
    elif step == 'dependencies':
        errors = validate_dependencies(step_data)
        if not errors:
            dsl_config['dependencies'] = step_data
    elif step == 'fault_tolerance':
        errors = validate_fault_tolerance(step_data)
        if not errors:
            dsl_config['fault_tolerance'] = step_data
    
    if errors:
        return jsonify({'success': False, 'errors': errors}), 400
    
    return jsonify({'success': True, 'message': 'Step saved successfully'})

@app.route('/api/get_config', methods=['GET'])
def get_config():
    """Get current configuration"""
    return jsonify(dsl_config)

@app.route('/api/download', methods=['GET'])
def download():
    """Download the YAML file"""
    global dsl_config
    
    # Add comment header
    yaml_content = "# Real-Time Orchestration Definition Language (RTOD)\n"
    yaml_content += "# Version: 1.0\n"
    yaml_content += f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    # Convert to YAML
    yaml_content += yaml.dump(dsl_config, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    # Create a BytesIO object
    bytes_io = io.BytesIO()
    bytes_io.write(yaml_content.encode('utf-8'))
    bytes_io.seek(0)
    
    return send_file(
        bytes_io,
        mimetype='text/yaml',
        as_attachment=True,
        download_name='orchestration.yaml'
    )

@app.route('/api/reset', methods=['POST'])
def reset():
    """Reset the configuration"""
    global dsl_config
    dsl_config = {}
    return jsonify({'success': True, 'message': 'Configuration reset'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
