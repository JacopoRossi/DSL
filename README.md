# Real-Time Task Orchestration DSL

A Flask web application to create DSL (Domain Specific Language) configurations for real-time task orchestration.

The DSL has three parts:
1. **global** – global information and execution-environment parameters (resources, real-time kernel configuration).
2. **images** – containerized task artifacts associating task aliases with their source components and the base task-wrapper image.
3. **schedule** – schedulable tasks with timing/placement properties and typed input/output interfaces.

## 🚀 Features

- **Step-by-step wizard**: Guided interface with 3 steps to define the configuration
- **Modern UI**: Clean and responsive design with smooth animations
- **Comprehensive validation**: Both client-side and server-side validation
  - Identifier, semantic-version, and image-reference pattern matching
  - Range validation for numeric fields
  - Duplicate alias / task-id detection
  - Schedule image aliases checked against defined artifacts
  - Typed input/output interface validation
- **Dynamic management**: Easily add/remove artifacts, tasks, and their I/O parameters
- **Ordered YAML export**: Download the configuration preserving DSL key order
- **Configuration reset**: Start over when needed

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## 🔧 Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## ▶️ Starting the Application

Run the command:
```bash
python app.py
```

The application will be available at: **http://localhost:5000**


## 🎨 Project Structure

```
DSL/
├── app.py                 # Main Flask application (validation + ordered YAML export)
├── requirements.txt       # Python dependencies
├── README.md             # This guide
├── templates/
│   └── index.html        # 3-step wizard HTML template
└── static/
    └── wizard.js         # Wizard JavaScript logic
```

## 📄 Generated DSL Example

```yaml
global:
  name: "satellite_mission_control"
  version: "2.1.0"
  description: "Real-time task orchestration"
  environment:
    resources:
      cpu_cores: 8
      memory_max: 8192
    real_time:
      kernel: "PREEMPT_RT"
      tick_resolution: "us"

images:
  base: "test/task-wrapper:1.1"
  repo: "test/task-wrapper"
  tasks:
    - alias: "task_1"
      src: "src_task_1"

schedule:
  name: "Configurable task test"
  description: "define task"
  iterations: 5
  tasks:
    - id: 1
      image: "task_1"
      start: 50
      deadline: 650
      cpu_affinity: 5
      policy: "fifo"
      priority: 50
      inputs:
        parameter1:
          type: int
          value: 17
      outputs:
        result:
          type: int
```

## 🔄 API Endpoints

- `GET /` - Main wizard page
- `POST /api/save_step` - Save step data
- `GET /api/get_config` - Get current configuration
- `GET /api/download` - Download YAML file
- `POST /api/reset` - Reset configuration


## 📝 Notes

- Configuration is kept in memory during the session
- When the server restarts, the configuration is lost
- For persistence, save the generated YAML file

## 🎯 Usage Example

1. Start the application
2. Fill in Step 1: global info and environment (e.g., name: "satellite_mission_control")
3. Step 2: define the base image, repo, and at least one task artifact alias
4. Step 3: define the execution plan and its tasks with typed inputs/outputs
5. Download the generated YAML file


