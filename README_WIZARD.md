# DSL Orchestration Wizard

A Flask web application to create DSL (Domain Specific Language) configurations for real-time orchestration through a guided wizard.

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

## 📋 Prerequisiti

- Python 3.8 o superiore
- pip (package manager Python)

## 🔧 Installazione

1. Installa le dipendenze:
```bash
pip install -r requirements.txt
```

## ▶️ Avvio dell'applicazione

Esegui il comando:
```bash
python app.py
```

L'applicazione sarà disponibile su: **http://localhost:5000**

## 📖 Guida all'uso

### Step 1: Informazioni Orchestrazione
Definisci le informazioni di base:
- **Nome**: Identificatore univoco (es. `satellite_mission_control`)
- **Versione**: Versione semantica (es. `1.0.0`)
- **Descrizione**: Breve descrizione del sistema

### Step 2: Configurazione Ambiente
Imposta i vincoli dell'ambiente di esecuzione:
- **Time Horizon**: Intervallo temporale di esecuzione
- **Risorse**: CPU cores, memoria massima, bandwidth
- **Real-Time**: Configurazione kernel real-time, tick resolution, periodi RT

### Step 3: Definizione Servizi
Aggiungi i servizi containerizzati:
- ID e nome del servizio
- Immagine container e runtime (Docker, Containerd, Podman)
- Risorse allocate (CPU shares, memory limit, CPU affinity)
- Capabilities e health check

### Step 4: Definizione Task
Crea i task con proprietà real-time:
- ID, nome e servizio associato
- **Real-Time Properties**: Policy (SCHED_FIFO, SCHED_RR), priorità, deadline, period
- **Execution**: Durata (WCET), utilizzo risorse
- **Constraints**: Esecuzioni concorrenti, ripetizioni, delay

### Step 5: Dipendenze e Precedenze
Definisci le relazioni tra task:
- Task sorgente e destinazione
- Tipo di relazione (starts, meets, overlaps, before)
- Delay e opzione wait_all

### Step 6: Fault Tolerance
Configura le politiche di gestione errori:
- **Recovery**: Politiche per task, service e system failure
- **Redundancy**: Task critici, strategia e numero di repliche

### Completamento
Clicca su "Completa e Scarica" per generare e scaricare il file YAML.

## 🎨 Struttura del progetto

```
DSL_ORCHESTRATOR/
├── app.py                 # Applicazione Flask principale
├── requirements.txt       # Dipendenze Python
├── README_WIZARD.md      # Questa guida
├── templates/
│   └── index.html        # Template HTML del wizard
└── static/
    └── wizard.js         # Logica JavaScript del wizard
```

## 🔄 API Endpoints

- `GET /` - Pagina principale del wizard
- `POST /api/save_step` - Salva i dati di uno step
- `GET /api/get_config` - Ottieni la configurazione corrente
- `GET /api/download` - Scarica il file YAML
- `POST /api/reset` - Reset della configurazione

## ✅ Validation Rules

The wizard enforces the following validation rules:

### Identifiers (Service IDs, Task IDs, Names)
- Must start with a letter
- Can contain only letters, numbers, underscores, and hyphens
- Cannot be empty
- Must be unique within their category

### Version Numbers
- Must follow semantic versioning format: `X.Y.Z` (e.g., `1.0.0`)
- Each component must be a number

### Container Images
- Must follow the format: `registry/name:tag`
- Example: `registry.sat/telemetry:v2.3`

### Numeric Fields
- **CPU Cores, Memory, Bandwidth**: Must be positive numbers (> 0)
- **Time Horizon**: End must be greater than start
- **Priority**: Must be between 1 and 99 (for real-time tasks)
- **Deadline, Duration**: Must be positive
- **Replicas**: Must be at least 1

### Dependencies
- "From" and "To" tasks must be different
- Referenced tasks must exist

### Required Fields
- **Step 1**: Name and Version are required
- **Step 3**: At least one service is required
- **Step 4**: At least one task is required; each task must have an ID and associated service

## 💡 Tips

1. **Define services first**: Tasks must be associated with existing services
2. **Check dependencies**: Make sure referenced tasks exist
3. **Auto-save**: The wizard automatically saves at each step
4. **Use reset**: If you make mistakes, you can start over
5. **Validation feedback**: Red borders and error messages indicate validation issues

## 🐛 Troubleshooting

**Problema**: La porta 5000 è già in uso
**Soluzione**: Modifica la porta in `app.py` cambiando `port=5000` con un altro numero

**Problema**: Errori di importazione moduli
**Soluzione**: Verifica di aver installato tutte le dipendenze con `pip install -r requirements.txt`

## 📝 Note

- La configurazione viene mantenuta in memoria durante la sessione
- Al riavvio del server, la configurazione viene persa
- Per persistenza, salva il file YAML generato

## 🎯 Esempio di utilizzo

1. Avvia l'applicazione
2. Compila i campi dello Step 1 (es. nome: "my_orchestration")
3. Procedi agli step successivi
4. Aggiungi almeno un servizio (Step 3)
5. Aggiungi almeno un task associato al servizio (Step 4)
6. Opzionalmente aggiungi dipendenze (Step 5)
7. Configura fault tolerance (Step 6)
8. Scarica il file YAML generato

Buon lavoro! 🚀
