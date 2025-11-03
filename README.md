# Service-Oriented Aerospace DSL

A Flask web application to create DSL (Domain Specific Language) configurations for real-time aerospace systems.

## 🚀 Features

- **Step-by-step wizard**: Guided interface with 6 steps to define the configuration
- **Modern UI**: Clean and responsive design with smooth animations
- **Comprehensive validation**: Both client-side and server-side validation
  - Real-time field validation with visual feedback
  - Pattern matching for identifiers, versions, and container images
  - Range validation for numeric fields
  - Duplicate ID detection
  - Dependency consistency checks
- **Dynamic management**: Easily add/remove services, tasks, and dependencies
- **YAML export**: Download the complete configuration in YAML format
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
DSL_ORCHESTRATOR/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This guide
├── templates/
│   └── index.html        # Wizard HTML template
└── static/
    └── wizard.js         # Wizard JavaScript logic
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
2. Fill in Step 1 fields (e.g., name: "my_orchestration")
3. Proceed to the following steps
4. Add at least one service (Step 3)
5. Add at least one task associated with the service (Step 4)
6. Optionally add dependencies (Step 5)
7. Configure fault tolerance (Step 6)
8. Download the generated YAML file


