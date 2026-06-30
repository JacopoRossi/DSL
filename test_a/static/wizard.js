const API_BASE = window.API_BASE || '';
let currentStep = 1;
const totalSteps = 3;

// Image artifacts: [{ alias, src }]
let artifacts = [];
// Execution plan tasks: [{ id, image, start, deadline, cpu_affinity, policy, priority, inputs:{}, outputs:{} }]
let planTasks = [];

// Modal scratch state for IO parameters
let modalInputs = [];   // [{ name, type, value }]
let modalOutputs = [];  // [{ name, type }]

const PATTERNS = {
    identifier: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    version: /^\d+\.\d+\.\d+$/,
    image: /^[a-zA-Z0-9._\/-]+:[a-zA-Z0-9._-]+$/
};
const TYPES = ['int', 'float', 'string', 'bool'];

document.addEventListener('DOMContentLoaded', function () {
    updateNavigationButtons();
});

// ---------------------------------------------------------------------------
// Validation error display
// ---------------------------------------------------------------------------
function showValidationErrors(errors) {
    clearValidationErrors();
    const box = document.createElement('div');
    box.className = 'validation-errors';
    box.style.cssText = 'background:#f8d7da;border:1px solid #f5c6cb;color:#721c24;padding:15px;border-radius:6px;margin-bottom:20px;';

    const title = document.createElement('strong');
    title.textContent = '⚠️ Validation Errors:';
    box.appendChild(title);

    const list = document.createElement('ul');
    list.style.margin = '10px 0 0 0';
    errors.forEach(e => {
        const li = document.createElement('li');
        li.textContent = e;
        list.appendChild(li);
    });
    box.appendChild(list);

    const stepEl = document.getElementById(`step-${currentStep}`);
    stepEl.insertBefore(box, stepEl.firstChild);
    stepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearValidationErrors() {
    const existing = document.querySelector('.validation-errors');
    if (existing) existing.remove();
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function nextStep() {
    if (currentStep < totalSteps) {
        if (!validateCurrentStep()) return;
        saveCurrentStep();
        currentStep++;
        showStep(currentStep);
        updateNavigationButtons();
        updateProgressBar();
        clearValidationErrors();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        updateNavigationButtons();
        updateProgressBar();
    }
}

function showStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
}

function updateNavigationButtons() {
    document.getElementById('prev-btn').style.display = currentStep > 1 ? 'block' : 'none';
    document.getElementById('next-btn').style.display = currentStep < totalSteps ? 'block' : 'none';
    document.getElementById('finish-btn').style.display = currentStep === totalSteps ? 'block' : 'none';
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < currentStep) step.classList.add('completed');
        else if (stepNum === currentStep) step.classList.add('active');
    });
}

// ---------------------------------------------------------------------------
// Per-step client-side validation
// ---------------------------------------------------------------------------
function validateCurrentStep() {
    clearValidationErrors();
    const errors = [];

    if (currentStep === 1) {
        const name = document.getElementById('g-name').value.trim();
        const version = document.getElementById('g-version').value.trim();
        if (!name) errors.push('Name is required');
        else if (!PATTERNS.identifier.test(name)) errors.push('Name must be a valid identifier');
        if (!version) errors.push('Version is required');
        else if (!PATTERNS.version.test(version)) errors.push('Version must follow semantic versioning (e.g., 2.1.0)');

        if (parseInt(document.getElementById('env-cpu-cores').value) < 1) errors.push('CPU cores must be >= 1');
        if (parseInt(document.getElementById('env-memory-max').value) < 1) errors.push('Memory max must be >= 1');
        if (!document.getElementById('env-rt-kernel').value.trim()) errors.push('Real-time kernel is required');
    }

    else if (currentStep === 2) {
        const base = document.getElementById('img-base').value.trim();
        const repo = document.getElementById('img-repo').value.trim();
        if (!base) errors.push('Base image is required');
        else if (!PATTERNS.image.test(base)) errors.push('Base image must follow format: repo/name:tag');
        if (!repo) errors.push('Repository is required');
        if (artifacts.length === 0) errors.push('At least one task artifact is required');
    }

    else if (currentStep === 3) {
        if (!document.getElementById('plan-name').value.trim()) errors.push('Execution plan name is required');
        if (parseInt(document.getElementById('plan-iterations').value) < 1) errors.push('Iterations must be >= 1');
        if (planTasks.length === 0) errors.push('At least one task is required');
    }

    if (errors.length > 0) {
        showValidationErrors(errors);
        return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Save steps to backend
// ---------------------------------------------------------------------------
function saveCurrentStep() {
    if (currentStep === 1) {
        const data = {
            name: document.getElementById('g-name').value.trim(),
            version: document.getElementById('g-version').value.trim(),
            description: document.getElementById('g-description').value.trim(),
            environment: {
                resources: {
                    cpu_cores: parseInt(document.getElementById('env-cpu-cores').value),
                    memory_max: parseInt(document.getElementById('env-memory-max').value)
                },
                real_time: {
                    kernel: document.getElementById('env-rt-kernel').value.trim(),
                    tick_resolution: document.getElementById('env-rt-tick').value
                }
            }
        };
        return saveStep('global', data);
    }

    if (currentStep === 2) {
        const data = {
            base: document.getElementById('img-base').value.trim(),
            repo: document.getElementById('img-repo').value.trim(),
            tasks: artifacts
        };
        return saveStep('image', data);
    }

    if (currentStep === 3) {
        const data = {
            name: document.getElementById('plan-name').value.trim(),
            description: document.getElementById('plan-description').value.trim(),
            iterations: parseInt(document.getElementById('plan-iterations').value),
            tasks: planTasks
        };
        return saveStep('execution-plan', data);
    }
}

function saveStep(step, data) {
    return fetch(`${API_BASE}/api/save_step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data })
    }).then(response => {
        if (!response.ok) {
            return response.json().then(d => {
                if (d.errors) showValidationErrors(d.errors);
                throw new Error('Validation failed');
            });
        }
        return response.json();
    }).catch(error => {
        console.error('Error saving step:', error);
        throw error;
    });
}

// ---------------------------------------------------------------------------
// Step 2: Image artifacts
// ---------------------------------------------------------------------------
function addArtifact() {
    document.getElementById('modal-artifact-alias').value = `task_${artifacts.length + 1}`;
    document.getElementById('modal-artifact-src').value = `src_task_${artifacts.length + 1}`;
    document.getElementById('artifactModal').style.display = 'block';
}

function closeArtifactModal() {
    document.getElementById('artifactModal').style.display = 'none';
}

function createArtifactFromModal() {
    const alias = document.getElementById('modal-artifact-alias').value.trim();
    const src = document.getElementById('modal-artifact-src').value.trim();

    if (!alias) { alert('Alias is required'); return; }
    if (!PATTERNS.identifier.test(alias)) { alert('Alias must be a valid identifier'); return; }
    if (!src) { alert('Source (src) is required'); return; }
    if (artifacts.some(a => a.alias === alias)) { alert(`Alias '${alias}' already exists`); return; }

    artifacts.push({ alias, src });
    renderArtifacts();
    closeArtifactModal();
}

function removeArtifact(index) {
    artifacts.splice(index, 1);
    renderArtifacts();
}

function renderArtifacts() {
    const container = document.getElementById('artifacts-list');
    container.innerHTML = '';
    artifacts.forEach((a, index) => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        div.innerHTML = `
            <button class="remove-btn remove-btn-abs" onclick="removeArtifact(${index})">✕</button>
            <div class="form-row">
                <div class="form-group">
                    <label>Alias</label>
                    <input type="text" value="${a.alias}" onchange="artifacts[${index}].alias=this.value">
                </div>
                <div class="form-group">
                    <label>Source (src)</label>
                    <input type="text" value="${a.src}" onchange="artifacts[${index}].src=this.value">
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// ---------------------------------------------------------------------------
// Step 3: Execution plan tasks
// ---------------------------------------------------------------------------
function addPlanTask() {
    if (artifacts.length === 0) {
        alert('Define at least one task artifact in the Image step first.');
        return;
    }
    // Pre-fill modal
    const nextId = planTasks.length > 0 ? Math.max(...planTasks.map(t => t.id)) + 1 : 1;
    document.getElementById('modal-task-id').value = nextId;
    document.getElementById('modal-task-affinity').value = 0;
    document.getElementById('modal-task-start').value = 50;
    document.getElementById('modal-task-deadline').value = 650;
    document.getElementById('modal-task-priority').value = 50;
    document.getElementById('modal-task-policy').value = 'fifo';

    const imageSelect = document.getElementById('modal-task-image');
    imageSelect.innerHTML = '<option value="">Select alias</option>';
    artifacts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.alias;
        opt.textContent = a.alias;
        imageSelect.appendChild(opt);
    });

    modalInputs = [];
    modalOutputs = [];
    renderModalInputs();
    renderModalOutputs();

    document.getElementById('taskModal').style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// --- Modal IO management ---
function addModalInput() {
    modalInputs.push({ name: `parameter${modalInputs.length + 1}`, type: 'int', value: '0' });
    renderModalInputs();
}

function removeModalInput(index) {
    modalInputs.splice(index, 1);
    renderModalInputs();
}

function renderModalInputs() {
    const container = document.getElementById('modal-inputs-list');
    container.innerHTML = '';
    modalInputs.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'io-row';
        div.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${p.name}" onchange="modalInputs[${index}].name=this.value">
            </div>
            <div class="form-group">
                <label>Type</label>
                <select onchange="modalInputs[${index}].type=this.value">
                    ${TYPES.map(t => `<option value="${t}" ${p.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Value</label>
                <input type="text" value="${p.value}" onchange="modalInputs[${index}].value=this.value">
            </div>
            <button class="remove-btn" onclick="removeModalInput(${index})">✕</button>
        `;
        container.appendChild(div);
    });
}

function addModalOutput() {
    modalOutputs.push({ name: `result${modalOutputs.length > 0 ? modalOutputs.length + 1 : ''}`, type: 'int' });
    renderModalOutputs();
}

function removeModalOutput(index) {
    modalOutputs.splice(index, 1);
    renderModalOutputs();
}

function renderModalOutputs() {
    const container = document.getElementById('modal-outputs-list');
    container.innerHTML = '';
    modalOutputs.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'io-row no-value';
        div.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${p.name}" onchange="modalOutputs[${index}].name=this.value">
            </div>
            <div class="form-group">
                <label>Type</label>
                <select onchange="modalOutputs[${index}].type=this.value">
                    ${TYPES.map(t => `<option value="${t}" ${p.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <button class="remove-btn" onclick="removeModalOutput(${index})">✕</button>
        `;
        container.appendChild(div);
    });
}

function createTaskFromModal() {
    const id = parseInt(document.getElementById('modal-task-id').value);
    const image = document.getElementById('modal-task-image').value;
    const start = parseInt(document.getElementById('modal-task-start').value);
    const deadline = parseInt(document.getElementById('modal-task-deadline').value);
    const cpu_affinity = parseInt(document.getElementById('modal-task-affinity').value);
    const policy = document.getElementById('modal-task-policy').value;
    const priority = parseInt(document.getElementById('modal-task-priority').value);

    if (isNaN(id)) { alert('Task ID must be an integer'); return; }
    if (!image) { alert('Image alias is required'); return; }
    if (planTasks.some(t => t.id === id)) { alert(`Task id '${id}' already exists`); return; }

    // Build inputs/outputs maps
    const inputs = {};
    for (const p of modalInputs) {
        if (!p.name.trim()) { alert('Every input needs a name'); return; }
        if (!PATTERNS.identifier.test(p.name.trim())) { alert(`Input '${p.name}' is not a valid identifier`); return; }
        inputs[p.name.trim()] = { type: p.type, value: p.value };
    }
    const outputs = {};
    for (const p of modalOutputs) {
        if (!p.name.trim()) { alert('Every output needs a name'); return; }
        if (!PATTERNS.identifier.test(p.name.trim())) { alert(`Output '${p.name}' is not a valid identifier`); return; }
        outputs[p.name.trim()] = { type: p.type };
    }

    planTasks.push({ id, image, start, deadline, cpu_affinity, policy, priority, inputs, outputs });
    renderPlanTasks();
    closeTaskModal();
}

function removePlanTask(index) {
    planTasks.splice(index, 1);
    renderPlanTasks();
}

function renderPlanTasks() {
    const container = document.getElementById('plan-tasks-list');
    container.innerHTML = '';
    planTasks.forEach((task, index) => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';

        const inputKeys = Object.keys(task.inputs || {});
        const outputKeys = Object.keys(task.outputs || {});

        div.innerHTML = `
            <div class="preview-card" onclick="togglePlanTaskDetails(${index})" style="cursor:pointer;background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);color:white;padding:15px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="flex:1;">
                        <div style="font-size:18px;font-weight:600;margin-bottom:5px;">⚙️ Task #${task.id} → ${task.image}</div>
                        <div style="font-size:12px;opacity:0.85;display:flex;gap:15px;flex-wrap:wrap;">
                            <span>⏱️ start: ${task.start}</span>
                            <span>🎯 deadline: ${task.deadline}</span>
                            <span>🧩 cpu: ${task.cpu_affinity}</span>
                            <span>📋 ${task.policy}</span>
                            <span>🔢 prio: ${task.priority}</span>
                        </div>
                        <div style="font-size:11px;opacity:0.75;margin-top:4px;">
                            ⬇️ inputs: ${inputKeys.length ? inputKeys.join(', ') : 'none'} • ⬆️ outputs: ${outputKeys.length ? outputKeys.join(', ') : 'none'}
                        </div>
                    </div>
                    <div style="font-size:20px;" id="plan-task-toggle-${index}">▼</div>
                </div>
            </div>
            <div id="plan-task-details-${index}" style="display:none;margin-top:10px;">
                <button class="remove-btn" onclick="removePlanTask(${index})">✕ Remove</button>
                <div class="form-row-3" style="margin-top:10px;">
                    <div class="form-group">
                        <label>ID</label>
                        <input type="number" value="${task.id}" onchange="planTasks[${index}].id=parseInt(this.value); renderPlanTasks();">
                    </div>
                    <div class="form-group">
                        <label>Image (alias)</label>
                        <select onchange="planTasks[${index}].image=this.value; renderPlanTasks();">
                            ${artifacts.map(a => `<option value="${a.alias}" ${task.image === a.alias ? 'selected' : ''}>${a.alias}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>CPU Affinity</label>
                        <input type="number" value="${task.cpu_affinity}" onchange="planTasks[${index}].cpu_affinity=parseInt(this.value);">
                    </div>
                </div>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Start</label>
                        <input type="number" value="${task.start}" onchange="planTasks[${index}].start=parseInt(this.value);">
                    </div>
                    <div class="form-group">
                        <label>Deadline</label>
                        <input type="number" value="${task.deadline}" onchange="planTasks[${index}].deadline=parseInt(this.value);">
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <input type="number" value="${task.priority}" onchange="planTasks[${index}].priority=parseInt(this.value);">
                    </div>
                </div>
                <div class="form-group">
                    <label>Policy</label>
                    <select onchange="planTasks[${index}].policy=this.value;">
                        <option value="fifo" ${task.policy === 'fifo' ? 'selected' : ''}>fifo</option>
                        <option value="rr" ${task.policy === 'rr' ? 'selected' : ''}>rr</option>
                        <option value="other" ${task.policy === 'other' ? 'selected' : ''}>other</option>
                    </select>
                </div>
                <div style="font-size:13px;color:#6c757d;">Edit inputs/outputs by removing and re-adding the task.</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function togglePlanTaskDetails(index) {
    const details = document.getElementById(`plan-task-details-${index}`);
    const toggle = document.getElementById(`plan-task-toggle-${index}`);
    if (details.style.display === 'none') {
        details.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        details.style.display = 'none';
        toggle.textContent = '▼';
    }
}

// ---------------------------------------------------------------------------
// Finish / Reset
// ---------------------------------------------------------------------------
function finishWizard() {
    if (!validateCurrentStep()) return;
    saveCurrentStep()
        .then(() => {
            window.location.href = `${API_BASE}/api/download`;
        })
        .catch(() => {
            // errors already shown
        });
}

function resetWizard() {
    if (confirm('Are you sure you want to reset the entire configuration?')) {
        fetch(`${API_BASE}/api/reset`, { method: 'POST' }).then(() => location.reload());
    }
}
