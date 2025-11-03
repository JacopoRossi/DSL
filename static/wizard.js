let currentStep = 1;
const totalSteps = 6;
let services = [];
let tasks = [];
let dependencies = [];

// Validation patterns
const PATTERNS = {
    identifier: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    version: /^\d+\.\d+\.\d+$/,
    image: /^[a-zA-Z0-9._\/-]+:[a-zA-Z0-9._-]+$/
};

// Initialize wizard
document.addEventListener('DOMContentLoaded', function() {
    updateNavigationButtons();
    setupRealTimeValidation();
});

// Setup real-time validation on input fields
function setupRealTimeValidation() {
    // Add validation on blur for identifier fields
    document.getElementById('orch-name')?.addEventListener('blur', function() {
        validateField(this, 'identifier', 'Name must start with a letter and contain only letters, numbers, underscores, and hyphens');
    });
    
    document.getElementById('orch-version')?.addEventListener('blur', function() {
        validateField(this, 'version', 'Version must follow semantic versioning (e.g., 1.0.0)');
    });
}

// Validate individual field
function validateField(input, type, errorMsg) {
    const value = input.value.trim();
    let isValid = true;
    
    if (value && !PATTERNS[type].test(value)) {
        isValid = false;
        input.style.borderColor = '#dc3545';
        showFieldError(input, errorMsg);
    } else {
        input.style.borderColor = '#ced4da';
        hideFieldError(input);
    }
    
    return isValid;
}

// Show field error
function showFieldError(input, message) {
    hideFieldError(input);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '4px';
    errorDiv.textContent = message;
    input.parentElement.appendChild(errorDiv);
}

// Hide field error
function hideFieldError(input) {
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Show validation errors
function showValidationErrors(errors) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'validation-errors';
    errorContainer.style.cssText = `
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 20px;
    `;
    
    const title = document.createElement('strong');
    title.textContent = '⚠️ Validation Errors:';
    errorContainer.appendChild(title);
    
    const errorList = document.createElement('ul');
    errorList.style.marginTop = '10px';
    errorList.style.marginBottom = '0';
    
    errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        errorList.appendChild(li);
    });
    
    errorContainer.appendChild(errorList);
    
    // Remove existing error container
    const existing = document.querySelector('.validation-errors');
    if (existing) {
        existing.remove();
    }
    
    // Add to current step
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    currentStepElement.insertBefore(errorContainer, currentStepElement.firstChild);
    
    // Scroll to top
    currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Clear validation errors
function clearValidationErrors() {
    const existing = document.querySelector('.validation-errors');
    if (existing) {
        existing.remove();
    }
}

function nextStep() {
    if (currentStep < totalSteps) {
        // Validate and save current step data
        if (!validateCurrentStep()) {
            return; // Don't proceed if validation fails
        }
        
        saveCurrentStep();
        
        // Move to next step
        currentStep++;
        showStep(currentStep);
        updateNavigationButtons();
        updateProgressBar();
        clearValidationErrors();
    }
}

// Validate current step before proceeding
function validateCurrentStep() {
    clearValidationErrors();
    const errors = [];
    
    switch(currentStep) {
        case 1: // Global
            const name = document.getElementById('orch-name').value.trim();
            const version = document.getElementById('orch-version').value.trim();
            
            if (!name) {
                errors.push('Name is required');
            } else if (!PATTERNS.identifier.test(name)) {
                errors.push('Name must start with a letter and contain only letters, numbers, underscores, and hyphens');
            }
            
            if (!version) {
                errors.push('Version is required');
            } else if (!PATTERNS.version.test(version)) {
                errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
            }
            break;
            
        case 2: // Environment
            const timeStart = parseInt(document.getElementById('env-time-start').value);
            const timeEnd = parseInt(document.getElementById('env-time-end').value);
            
            if (timeEnd <= timeStart) {
                errors.push('Time horizon end must be greater than start');
            }
            
            const cpuCores = parseInt(document.getElementById('env-cpu-cores').value);
            const memoryMax = parseInt(document.getElementById('env-memory-max').value);
            
            if (cpuCores <= 0) errors.push('CPU cores must be positive');
            if (memoryMax <= 0) errors.push('Memory max must be positive');
            break;
            
        case 3: // Services
            if (services.length === 0) {
                errors.push('At least one service is required');
            } else {
                const serviceIds = new Set();
                services.forEach((service, idx) => {
                    const prefix = `Service ${idx + 1}: `;
                    
                    if (!service.id) {
                        errors.push(prefix + 'ID is required');
                    } else if (!PATTERNS.identifier.test(service.id)) {
                        errors.push(prefix + 'ID must be a valid identifier');
                    } else if (serviceIds.has(service.id)) {
                        errors.push(prefix + `Duplicate ID '${service.id}'`);
                    } else {
                        serviceIds.add(service.id);
                    }
                    
                    if (!service.container.image) {
                        errors.push(prefix + 'Container image is required');
                    } else if (!PATTERNS.image.test(service.container.image)) {
                        errors.push(prefix + 'Container image must follow format: registry/name:tag');
                    }
                });
            }
            break;
            
        case 4: // Tasks
            if (tasks.length === 0) {
                errors.push('At least one task is required');
            } else {
                const taskIds = new Set();
                tasks.forEach((task, idx) => {
                    const prefix = `Task ${idx + 1}: `;
                    
                    if (!task.id) {
                        errors.push(prefix + 'ID is required');
                    } else if (!PATTERNS.identifier.test(task.id)) {
                        errors.push(prefix + 'ID must be a valid identifier');
                    } else if (taskIds.has(task.id)) {
                        errors.push(prefix + `Duplicate ID '${task.id}'`);
                    } else {
                        taskIds.add(task.id);
                    }
                    
                    if (!task.service) {
                        errors.push(prefix + 'Service is required');
                    }
                    
                    if (task.real_time.priority < 1 || task.real_time.priority > 99) {
                        errors.push(prefix + 'Priority must be between 1 and 99');
                    }
                    
                    if (task.real_time.deadline <= 0) {
                        errors.push(prefix + 'Deadline must be positive');
                    }
                });
            }
            break;
            
        case 5: // Dependencies
            dependencies.forEach((dep, idx) => {
                const prefix = `Dependency ${idx + 1}: `;
                
                if (!dep.from) {
                    errors.push(prefix + "'From' task is required");
                }
                if (!dep.to) {
                    errors.push(prefix + "'To' task is required");
                }
                if (dep.from && dep.to && dep.from === dep.to) {
                    errors.push(prefix + "'From' and 'To' tasks cannot be the same");
                }
            });
            break;
            
        case 6: // Fault Tolerance
            const maxRetries = parseInt(document.getElementById('ft-task-retries').value);
            
            if (maxRetries < 0) errors.push('Max retries must be positive');
            break;
    }
    
    if (errors.length > 0) {
        showValidationErrors(errors);
        return false;
    }
    
    return true;
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
    // Hide all steps
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    
    // Show current step
    document.getElementById(`step-${step}`).classList.add('active');
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    
    prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
    nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';
    finishBtn.style.display = currentStep === totalSteps ? 'block' : 'none';
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < currentStep) {
            step.classList.add('completed');
        } else if (stepNum === currentStep) {
            step.classList.add('active');
        }
    });
}

function saveCurrentStep() {
    let data = {};
    
    switch(currentStep) {
        case 1:
            data = {
                name: document.getElementById('orch-name').value,
                version: document.getElementById('orch-version').value,
                description: document.getElementById('orch-description').value
            };
            saveStep('global', data);
            break;
            
        case 2:
            data = {
                time_horizon: {
                    start: parseInt(document.getElementById('env-time-start').value),
                    end: parseInt(document.getElementById('env-time-end').value)
                },
                resources: {
                    cpu_cores: parseInt(document.getElementById('env-cpu-cores').value),
                    memory_max: parseInt(document.getElementById('env-memory-max').value)
                },
                real_time: {
                    kernel: document.getElementById('env-rt-kernel').value,
                    tick_resolution: document.getElementById('env-rt-tick').value,
                    rt_period: parseInt(document.getElementById('env-rt-period').value),
                    rt_runtime: parseInt(document.getElementById('env-rt-runtime').value)
                }
            };
            saveStep('environment', data);
            break;
            
        case 3:
            saveStep('services', services);
            break;
            
        case 4:
            saveStep('tasks', tasks);
            break;
            
        case 5:
            data = {
                precedence: dependencies
            };
            saveStep('dependencies', data);
            break;
            
        case 6:
            data = {
                recovery: {
                    task_failure: {
                        policy: document.getElementById('ft-task-policy').value,
                        max_retries: parseInt(document.getElementById('ft-task-retries').value)
                    },
                    service_failure: {
                        policy: document.getElementById('ft-service-policy').value,
                        timeout: parseInt(document.getElementById('ft-service-timeout').value)
                    },
                    system_failure: {
                        policy: document.getElementById('ft-system-policy').value,
                        checkpoint_interval: parseInt(document.getElementById('ft-system-checkpoint').value)
                    }
                }
            };
            saveStep('fault_tolerance', data);
            break;
    }
}

function saveStep(step, data) {
    return fetch('/api/save_step', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            step: step,
            data: data
        })
    }).then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                if (data.errors) {
                    showValidationErrors(data.errors);
                }
                throw new Error('Validation failed');
            });
        }
        return response.json();
    }).catch(error => {
        console.error('Error saving step:', error);
    });
}

// Service Management
function addService() {
    // Open modal instead of directly creating
    openServiceModal();
}

function openServiceModal() {
    const modal = document.getElementById('serviceModal');
    // Pre-fill with default values
    document.getElementById('modal-service-id').value = `service_${services.length + 1}`;
    document.getElementById('modal-service-name').value = '';
    document.getElementById('modal-service-image').value = '';
    document.getElementById('modal-service-runtime').value = 'docker';
    document.getElementById('modal-service-memory').value = 512;
    document.getElementById('modal-service-affinity').value = '';
    document.getElementById('modal-service-capabilities').value = '';
    document.getElementById('modal-service-hc-interval').value = 100;
    document.getElementById('modal-service-hc-timeout').value = 50;
    document.getElementById('modal-service-hc-retries').value = 3;
    modal.style.display = 'block';
}

function closeServiceModal() {
    const modal = document.getElementById('serviceModal');
    modal.style.display = 'none';
}

function createServiceFromModal() {
    const serviceId = document.getElementById('modal-service-id').value.trim();
    const serviceName = document.getElementById('modal-service-name').value.trim();
    const serviceImage = document.getElementById('modal-service-image').value.trim();
    const serviceRuntime = document.getElementById('modal-service-runtime').value;
    const memoryLimit = parseInt(document.getElementById('modal-service-memory').value);
    const cpuAffinity = document.getElementById('modal-service-affinity').value.trim();
    const capabilities = document.getElementById('modal-service-capabilities').value.trim();
    const hcInterval = parseInt(document.getElementById('modal-service-hc-interval').value);
    const hcTimeout = parseInt(document.getElementById('modal-service-hc-timeout').value);
    const hcRetries = parseInt(document.getElementById('modal-service-hc-retries').value);
    
    // Validate required fields
    if (!serviceId) {
        alert('Service ID is required');
        return;
    }
    
    if (!PATTERNS.identifier.test(serviceId)) {
        alert('Service ID must start with a letter and contain only letters, numbers, underscores, and hyphens');
        return;
    }
    
    if (!serviceImage) {
        alert('Container Image is required');
        return;
    }
    
    if (!PATTERNS.image.test(serviceImage)) {
        alert('Container Image must follow format: registry/name:tag');
        return;
    }
    
    // Check for duplicate ID
    if (services.some(s => s.id === serviceId)) {
        alert(`Service ID '${serviceId}' already exists`);
        return;
    }
    
    // Parse CPU affinity
    const affinityArray = cpuAffinity ? cpuAffinity.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v)) : [];
    
    // Parse capabilities
    const capabilitiesArray = capabilities ? capabilities.split(',').map(c => c.trim()).filter(c => c) : [];
    
    // Create service
    const service = {
        id: serviceId,
        name: serviceName,
        container: {
            image: serviceImage,
            runtime: serviceRuntime,
            resources: {
                memory_limit: memoryLimit,
                cpu_affinity: affinityArray
            }
        },
        capabilities: capabilitiesArray,
        health_check: {
            interval: hcInterval,
            timeout: hcTimeout,
            retries: hcRetries
        }
    };
    
    services.push(service);
    renderServices();
    closeServiceModal();
}

function removeService(index) {
    services.splice(index, 1);
    renderServices();
}

function renderServices() {
    const container = document.getElementById('services-list');
    container.innerHTML = '';
    
    services.forEach((service, index) => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        
        // Create preview card
        const previewHtml = `
            <div class="preview-card" onclick="toggleServiceDetails(${index})" style="cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">
                            📦 ${service.id || 'New Service'}
                        </div>
                        <div style="font-size: 13px; opacity: 0.9;">
                            ${service.name || 'No name set'} • ${service.container.image || 'No image'}
                        </div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                            💾 RAM: ${service.container.resources.memory_limit}MB • 🐳 ${service.container.runtime}
                        </div>
                    </div>
                    <div style="font-size: 20px;" id="service-toggle-${index}">▼</div>
                </div>
            </div>
        `;
        
        div.innerHTML = previewHtml + `
            <div id="service-details-${index}" style="display: none;">
                <button class="remove-btn" onclick="removeService(${index})">✕ Remove</button>
                <div class="form-row">
                    <div class="form-group">
                        <label>Service ID *</label>
                        <input type="text" value="${service.id}" onchange="updateService(${index}, 'id', this.value); renderServices();">
                    </div>
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" value="${service.name}" onchange="updateService(${index}, 'name', this.value); renderServices();">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Container Image *</label>
                        <input type="text" value="${service.container.image}" onchange="updateServiceContainer(${index}, 'image', this.value); renderServices();" placeholder="e.g. registry.sat/service:v1.0">
                    </div>
                    <div class="form-group">
                        <label>Runtime</label>
                        <select onchange="updateServiceContainer(${index}, 'runtime', this.value); renderServices();">
                            <option value="docker" ${service.container.runtime === 'docker' ? 'selected' : ''}>Docker</option>
                            <option value="containerd" ${service.container.runtime === 'containerd' ? 'selected' : ''}>Containerd</option>
                            <option value="podman" ${service.container.runtime === 'podman' ? 'selected' : ''}>Podman</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Memory Limit (MB)</label>
                        <input type="number" value="${service.container.resources.memory_limit}" onchange="updateServiceResource(${index}, 'memory_limit', parseInt(this.value)); renderServices();">
                    </div>
                    <div class="form-group">
                        <label>CPU Affinity (e.g. 0,1)</label>
                        <input type="text" value="${service.container.resources.cpu_affinity.join(',')}" onchange="updateServiceAffinity(${index}, this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Capabilities (comma separated)</label>
                    <input type="text" value="${service.capabilities.join(', ')}" onchange="updateServiceCapabilities(${index}, this.value)" placeholder="e.g. COMM_DOWNLINK, DATA_COMPRESSION">
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleServiceDetails(index) {
    const details = document.getElementById(`service-details-${index}`);
    const toggle = document.getElementById(`service-toggle-${index}`);
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        details.style.display = 'none';
        toggle.textContent = '▼';
    }
}

function updateService(index, field, value) {
    services[index][field] = value;
}

function updateServiceContainer(index, field, value) {
    services[index].container[field] = value;
}

function updateServiceResource(index, field, value) {
    services[index].container.resources[field] = value;
}

function updateServiceAffinity(index, value) {
    services[index].container.resources.cpu_affinity = value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
}

function updateServiceCapabilities(index, value) {
    services[index].capabilities = value.split(',').map(c => c.trim()).filter(c => c);
}

// Task Management
function addTask() {
    // Open modal instead of directly creating
    openTaskModal();
}

function openTaskModal() {
    const modal = document.getElementById('taskModal');
    // Pre-fill with default values
    document.getElementById('modal-task-id').value = `task_${tasks.length + 1}`;
    document.getElementById('modal-task-name').value = '';
    document.getElementById('modal-task-policy').value = 'SCHED_FIFO';
    document.getElementById('modal-task-priority').value = 90;
    document.getElementById('modal-task-deadline').value = 100;
    document.getElementById('modal-task-period').value = '';
    document.getElementById('modal-task-duration').value = 50;
    document.getElementById('modal-task-cpu').value = 1;
    document.getElementById('modal-task-memory').value = 256;
    document.getElementById('modal-task-concurrent').value = 1;
    document.getElementById('modal-task-repetitions').value = 1;
    document.getElementById('modal-task-rep-delay').value = 0;
    
    // Populate service dropdown
    const serviceSelect = document.getElementById('modal-task-service');
    serviceSelect.innerHTML = '<option value="">Select service</option>';
    services.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.id;
        serviceSelect.appendChild(option);
    });
    
    modal.style.display = 'block';
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.style.display = 'none';
}

function createTaskFromModal() {
    const taskId = document.getElementById('modal-task-id').value.trim();
    const taskName = document.getElementById('modal-task-name').value.trim();
    const taskService = document.getElementById('modal-task-service').value;
    const taskPolicy = document.getElementById('modal-task-policy').value;
    const taskPriority = parseInt(document.getElementById('modal-task-priority').value);
    const taskDeadline = parseInt(document.getElementById('modal-task-deadline').value);
    const taskPeriodStr = document.getElementById('modal-task-period').value.trim();
    const taskPeriod = taskPeriodStr ? parseInt(taskPeriodStr) : null;
    const taskDuration = parseInt(document.getElementById('modal-task-duration').value);
    const taskCpu = parseInt(document.getElementById('modal-task-cpu').value);
    const taskMemory = parseInt(document.getElementById('modal-task-memory').value);
    const taskConcurrent = parseInt(document.getElementById('modal-task-concurrent').value);
    const taskRepetitions = parseInt(document.getElementById('modal-task-repetitions').value);
    const taskRepDelay = parseInt(document.getElementById('modal-task-rep-delay').value);
    
    // Validate required fields
    if (!taskId) {
        alert('Task ID is required');
        return;
    }
    
    if (!PATTERNS.identifier.test(taskId)) {
        alert('Task ID must start with a letter and contain only letters, numbers, underscores, and hyphens');
        return;
    }
    
    if (!taskService) {
        alert('Service is required');
        return;
    }
    
    if (taskPriority < 1 || taskPriority > 99) {
        alert('Priority must be between 1 and 99');
        return;
    }
    
    if (taskDeadline <= 0) {
        alert('Deadline must be positive');
        return;
    }
    
    // Check for duplicate ID
    if (tasks.some(t => t.id === taskId)) {
        alert(`Task ID '${taskId}' already exists`);
        return;
    }
    
    // Create task
    const task = {
        id: taskId,
        name: taskName,
        service: taskService,
        real_time: {
            policy: taskPolicy,
            priority: taskPriority,
            deadline: taskDeadline,
            period: taskPeriod
        },
        execution: {
            duration: taskDuration,
            resource_usage: {
                cpu: taskCpu,
                memory: taskMemory
            }
        },
        constraints: {
            max_concurrent: taskConcurrent,
            repetitions: taskRepetitions,
            repetition_delay: taskRepDelay
        }
    };
    
    tasks.push(task);
    renderTasks();
    closeTaskModal();
}

function removeTask(index) {
    tasks.splice(index, 1);
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    container.innerHTML = '';
    
    tasks.forEach((task, index) => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        
        // Build service options
        let serviceOptions = '<option value="">Select service</option>';
        services.forEach(s => {
            serviceOptions += `<option value="${s.id}" ${task.service === s.id ? 'selected' : ''}>${s.id}</option>`;
        });
        
        // Determine task type icon and color
        const isPeriodic = task.real_time.period !== null;
        const taskType = isPeriodic ? '🔄 Periodic' : '⚡ Aperiodic';
        const priorityColor = task.real_time.priority >= 95 ? '🔴' : task.real_time.priority >= 80 ? '🟡' : '🟢';
        
        // Create preview card
        const previewHtml = `
            <div class="preview-card" onclick="toggleTaskDetails(${index})" style="cursor: pointer; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">
                            ⚙️ ${task.id || 'New Task'}
                        </div>
                        <div style="font-size: 13px; opacity: 0.9;">
                            ${task.name || 'No name set'} • Service: ${task.service || 'Not assigned'}
                        </div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px; display: flex; gap: 15px; flex-wrap: wrap;">
                            <span>${taskType}</span>
                            <span>${priorityColor} Priority: ${task.real_time.priority}</span>
                            <span>⏱️ Deadline: ${task.real_time.deadline}ms</span>
                            <span>⚡ WCET: ${task.execution.duration}ms</span>
                        </div>
                        <div style="font-size: 11px; opacity: 0.75; margin-top: 3px;">
                            📊 CPU: ${task.execution.resource_usage.cpu} • 💾 RAM: ${task.execution.resource_usage.memory}MB
                        </div>
                    </div>
                    <div style="font-size: 20px;" id="task-toggle-${index}">▼</div>
                </div>
            </div>
        `;
        
        div.innerHTML = previewHtml + `
            <div id="task-details-${index}" style="display: none;">
                <button class="remove-btn" onclick="removeTask(${index})">✕ Remove</button>
                <div class="form-row">
                    <div class="form-group">
                        <label>Task ID *</label>
                        <input type="text" value="${task.id}" onchange="updateTask(${index}, 'id', this.value); renderTasks();">
                    </div>
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" value="${task.name}" onchange="updateTask(${index}, 'name', this.value); renderTasks();">
                    </div>
                </div>
                <div class="form-group">
                    <label>Service *</label>
                    <select onchange="updateTask(${index}, 'service', this.value); renderTasks();">
                        ${serviceOptions}
                    </select>
                </div>
                <h4 style="margin-top: 15px; margin-bottom: 10px; font-size: 14px; font-weight: 600;">Real-Time Properties</h4>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Policy</label>
                        <select onchange="updateTaskRT(${index}, 'policy', this.value); renderTasks();">
                            <option value="SCHED_FIFO" ${task.real_time.policy === 'SCHED_FIFO' ? 'selected' : ''}>SCHED_FIFO</option>
                            <option value="SCHED_RR" ${task.real_time.policy === 'SCHED_RR' ? 'selected' : ''}>SCHED_RR</option>
                            <option value="SCHED_OTHER" ${task.real_time.policy === 'SCHED_OTHER' ? 'selected' : ''}>SCHED_OTHER</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority (1-99)</label>
                        <input type="number" min="1" max="99" value="${task.real_time.priority}" onchange="updateTaskRT(${index}, 'priority', parseInt(this.value)); renderTasks();">
                    </div>
                    <div class="form-group">
                        <label>Deadline (ms)</label>
                        <input type="number" value="${task.real_time.deadline}" onchange="updateTaskRT(${index}, 'deadline', parseInt(this.value)); renderTasks();">
                    </div>
                </div>
                <div class="form-group">
                    <label>Period (ms, null for non-periodic)</label>
                    <input type="text" value="${task.real_time.period || ''}" onchange="updateTaskRT(${index}, 'period', this.value ? parseInt(this.value) : null); renderTasks();" placeholder="Leave empty for null">
                </div>
                <h4 style="margin-top: 15px; margin-bottom: 10px; font-size: 14px; font-weight: 600;">Execution</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Duration (WCET, ms)</label>
                        <input type="number" value="${task.execution.duration}" onchange="updateTaskExec(${index}, 'duration', parseInt(this.value)); renderTasks();">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>CPU</label>
                        <input type="number" value="${task.execution.resource_usage.cpu}" onchange="updateTaskResource(${index}, 'cpu', parseInt(this.value)); renderTasks();">
                    </div>
                    <div class="form-group">
                        <label>Memory (MB)</label>
                        <input type="number" value="${task.execution.resource_usage.memory}" onchange="updateTaskResource(${index}, 'memory', parseInt(this.value)); renderTasks();">
                    </div>
                </div>
                <h4 style="margin-top: 15px; margin-bottom: 10px; font-size: 14px; font-weight: 600;">Constraints</h4>
                <div class="form-row-3">
                    <div class="form-group">
                        <label>Max Concurrent</label>
                        <input type="number" value="${task.constraints.max_concurrent}" onchange="updateTaskConstraint(${index}, 'max_concurrent', parseInt(this.value))">
                    </div>
                    <div class="form-group">
                        <label>Repetitions</label>
                        <input type="number" value="${task.constraints.repetitions}" onchange="updateTaskConstraint(${index}, 'repetitions', parseInt(this.value))">
                    </div>
                    <div class="form-group">
                        <label>Repetition Delay (ms)</label>
                        <input type="number" value="${task.constraints.repetition_delay}" onchange="updateTaskConstraint(${index}, 'repetition_delay', parseInt(this.value))">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleTaskDetails(index) {
    const details = document.getElementById(`task-details-${index}`);
    const toggle = document.getElementById(`task-toggle-${index}`);
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        details.style.display = 'none';
        toggle.textContent = '▼';
    }
}

function updateTask(index, field, value) {
    tasks[index][field] = value;
}

function updateTaskRT(index, field, value) {
    tasks[index].real_time[field] = value;
}

function updateTaskExec(index, field, value) {
    tasks[index].execution[field] = value;
}

function updateTaskResource(index, field, value) {
    tasks[index].execution.resource_usage[field] = value;
}

function updateTaskConstraint(index, field, value) {
    tasks[index].constraints[field] = value;
}

// Dependency Management
function addDependency() {
    const dependency = {
        from: '',
        to: '',
        type: 'start',
        delay: 0,
        wait_all: false
    };
    
    dependencies.push(dependency);
    renderDependencies();
}

function removeDependency(index) {
    dependencies.splice(index, 1);
    renderDependencies();
}

function renderDependencies() {
    const container = document.getElementById('dependencies-list');
    container.innerHTML = '';
    
    dependencies.forEach((dep, index) => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        
        // Build task options
        let taskOptions = '<option value="">Select task</option>';
        tasks.forEach(t => {
            taskOptions += `<option value="${t.id}">${t.id}</option>`;
        });
        
        div.innerHTML = `
            <button class="remove-btn" onclick="removeDependency(${index})">✕ Remove</button>
            <div class="form-row">
                <div class="form-group">
                    <label>From Task *</label>
                    <select onchange="updateDependency(${index}, 'from', this.value)">
                        ${taskOptions.replace(`value="${dep.from}"`, `value="${dep.from}" selected`)}
                    </select>
                </div>
                <div class="form-group">
                    <label>To Task *</label>
                    <select onchange="updateDependency(${index}, 'to', this.value)">
                        ${taskOptions.replace(`value="${dep.to}"`, `value="${dep.to}" selected`)}
                    </select>
                </div>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label>Type</label>
                    <select onchange="updateDependency(${index}, 'type', this.value)">
                        <option value="start" ${dep.type === 'start' ? 'selected' : ''}>Start</option>
                        <option value="finish" ${dep.type === 'finish' ? 'selected' : ''}>Finish</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Delay (ms)</label>
                    <input type="number" value="${dep.delay}" onchange="updateDependency(${index}, 'delay', parseInt(this.value))">
                </div>
                <div class="form-group">
                    <label class="checkbox-group">
                        <input type="checkbox" ${dep.wait_all ? 'checked' : ''} onchange="updateDependency(${index}, 'wait_all', this.checked)">
                        Wait All
                    </label>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateDependency(index, field, value) {
    dependencies[index][field] = value;
}

// Finish Wizard
function finishWizard() {
    // Validate final step
    if (!validateCurrentStep()) {
        return;
    }
    
    // Save final step
    saveCurrentStep();
    
    // Wait a bit for the save to complete, then download
    setTimeout(() => {
        window.location.href = '/api/download';
        
        // Show success message
        alert('✓ Configuration completed! The YAML file has been downloaded.');
    }, 500);
}

function resetWizard() {
    if (confirm('Are you sure you want to reset the entire configuration?')) {
        fetch('/api/reset', {
            method: 'POST'
        }).then(() => {
            location.reload();
        });
    }
}
