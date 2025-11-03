# Documento di Test - Configurazione Sistema di Monitoraggio Satellitare

## Indice
1. [Configurazione Tecnica Dettagliata](#configurazione-tecnica-dettagliata)
2. [Descrizione in Linguaggio Naturale](#descrizione-in-linguaggio-naturale)
3. [Guida per il Test Utente](#guida-per-il-test-utente)

---

## Configurazione Tecnica Dettagliata

### Step 1: Global Information
```
Name: satellite_monitoring_system
Version: 1.0.0
Description: Real-time satellite monitoring and data processing system
```

### Step 2: Environment Configuration

**Time Horizon:**
- Start: 0 ms
- End: 10000 ms

**Resources:**
- CPU Cores: 8
- Memory Max: 16384 MB

**Real-Time:**
- Kernel: PREEMPT_RT
- Tick Resolution: us (microseconds)
- RT Period: 1000000 us
- RT Runtime: 950000 us

### Step 3: Services

#### Service 1: Telemetry Service
- **Service ID:** `telemetry_service`
- **Name:** Telemetry Data Handler
- **Container Image:** `satellite.io/telemetry:v2.1`
- **Runtime:** docker
- **Isolation:** process
- **Memory Limit:** 2048 MB
- **CPU Affinity:** 0,1
- **Capabilities:** TELEMETRY_READ, DATA_PARSE
- **Health Check:**
  - Interval: 100 ms
  - Timeout: 50 ms
  - Retries: 3

#### Service 2: Processing Service
- **Service ID:** `processing_service`
- **Name:** Data Processing Engine
- **Container Image:** `satellite.io/processor:v1.5`
- **Runtime:** docker
- **Isolation:** process
- **Memory Limit:** 4096 MB
- **CPU Affinity:** 2,3,4
- **Capabilities:** DATA_PROCESS, COMPUTE_INTENSIVE
- **Health Check:**
  - Interval: 200 ms
  - Timeout: 100 ms
  - Retries: 2

#### Service 3: Communication Service
- **Service ID:** `comm_service`
- **Name:** Ground Station Communication
- **Container Image:** `satellite.io/comms:v3.0`
- **Runtime:** docker
- **Isolation:** process
- **Memory Limit:** 1024 MB
- **CPU Affinity:** 5,6
- **Capabilities:** DOWNLINK, UPLINK, ENCRYPTION
- **Health Check:**
  - Interval: 50 ms
  - Timeout: 30 ms
  - Retries: 5

### Step 4: Tasks

#### Task 1: Initialize Communication
- **Task ID:** `task_init_comm`
- **Name:** Initialize Communication Link
- **Service:** comm_service
- **Scheduling Policy:** SCHED_FIFO
- **Priority:** 95 (1-99)
- **Deadline:** 50 ms
- **Period:** (empty - aperiodic task)
- **Duration (WCET):** 30 ms
- **CPU Units:** 2
- **Memory:** 256 MB
- **Max Concurrent:** 1
- **Repetitions:** 1
- **Repetition Delay:** 0 ms

#### Task 2: Collect Telemetry
- **Task ID:** `task_collect_telemetry`
- **Name:** Collect Satellite Telemetry
- **Service:** telemetry_service
- **Scheduling Policy:** SCHED_FIFO
- **Priority:** 90
- **Deadline:** 100 ms
- **Period:** 100 ms (periodic task)
- **Duration (WCET):** 60 ms
- **CPU Units:** 1
- **Memory:** 512 MB
- **Max Concurrent:** 2
- **Repetitions:** 0 (infinite)
- **Repetition Delay:** 0 ms

#### Task 3: Process Data
- **Task ID:** `task_process_data`
- **Name:** Process Telemetry Data
- **Service:** processing_service
- **Scheduling Policy:** SCHED_FIFO
- **Priority:** 85
- **Deadline:** 200 ms
- **Period:** 200 ms (periodic task)
- **Duration (WCET):** 150 ms
- **CPU Units:** 3
- **Memory:** 2048 MB
- **Max Concurrent:** 1
- **Repetitions:** 0 (infinite)
- **Repetition Delay:** 0 ms

#### Task 4: Send to Ground
- **Task ID:** `task_send_ground`
- **Name:** Transmit to Ground Station
- **Service:** comm_service
- **Scheduling Policy:** SCHED_FIFO
- **Priority:** 92
- **Deadline:** 80 ms
- **Period:** (empty - aperiodic task)
- **Duration (WCET):** 50 ms
- **CPU Units:** 2
- **Memory:** 512 MB
- **Max Concurrent:** 1
- **Repetitions:** 0 (infinite)
- **Repetition Delay:** 10 ms

### Step 5: Dependencies

1. **Dependency 1:**
   - From: task_init_comm
   - To: task_collect_telemetry
   - Type: finish_to_start

2. **Dependency 2:**
   - From: task_collect_telemetry
   - To: task_process_data
   - Type: finish_to_start

3. **Dependency 3:**
   - From: task_process_data
   - To: task_send_ground
   - Type: finish_to_start

### Step 6: Fault Tolerance

**Recovery - Task Failure:**
- Policy: restart
- Max Retries: 3
- Backoff: exponential

**Recovery - Service Failure:**
- Policy: replace
- Timeout: 2000 ms

**Recovery - System Failure:**
- Policy: reboot
- Checkpoint Interval: 5000 ms

**Redundancy:**
- Critical Tasks: task_init_comm, task_send_ground
- Strategy: active
- Replicas: 2

---

## Descrizione in Linguaggio Naturale

### Scenario: Sistema di Monitoraggio Satellitare in Tempo Reale

Immagina di dover configurare un sistema software che gestisce le comunicazioni e l'elaborazione dati di un satellite in orbita. Il sistema deve funzionare in tempo reale, rispettando scadenze precise e gestendo eventuali guasti.

### Il Sistema Globale

Stiamo creando un sistema chiamato **"satellite_monitoring_system"** alla versione 1.0.0. Questo sistema si occupa del monitoraggio in tempo reale del satellite e dell'elaborazione dei suoi dati.

### L'Ambiente di Esecuzione

Il sistema funzionerà per un periodo di 10 secondi (da 0 a 10000 millisecondi) e avrà a disposizione:
- **8 core di CPU** per distribuire il carico di lavoro
- **16 GB di memoria RAM** (16384 MB) per gestire tutti i processi

Il sistema usa un kernel Linux real-time (PREEMPT_RT) che garantisce risposte precise e tempestive, con una risoluzione temporale in microsecondi.

### I Servizi (Componenti Software)

Il sistema è composto da tre servizi principali, ognuno in esecuzione in un container Docker isolato:

#### 1. Servizio di Telemetria
Questo servizio si occupa di **raccogliere e leggere i dati** provenienti dai sensori del satellite. Ha:
- 2 GB di memoria dedicata
- Accesso esclusivo ai core CPU 0 e 1
- Controllo dello stato di salute ogni 100 millisecondi
- Capacità di leggere telemetria e analizzare i dati

#### 2. Servizio di Elaborazione
Questo è il **"cervello" del sistema** che elabora i dati raccolti. Ha:
- 4 GB di memoria (il doppio degli altri, perché fa calcoli complessi)
- Accesso ai core CPU 2, 3 e 4 (tre core per maggiore potenza)
- Controllo dello stato ogni 200 millisecondi
- Capacità di elaborazione intensiva dei dati

#### 3. Servizio di Comunicazione
Questo servizio gestisce le **comunicazioni con la stazione di terra**. Ha:
- 1 GB di memoria
- Accesso ai core CPU 5 e 6
- Controllo molto frequente (ogni 50 millisecondi) perché è critico
- Capacità di trasmettere, ricevere e criptare i dati

### Le Attività (Tasks)

Il sistema esegue quattro attività principali, in ordine di importanza:

#### 1. Inizializzazione della Comunicazione (Priorità Massima: 95)
**Cosa fa:** Stabilisce il collegamento iniziale con la stazione di terra.
**Quando:** All'inizio, una sola volta.
**Tempo massimo:** Deve completarsi entro 50 millisecondi, tipicamente ne impiega 30.
**Importanza:** CRITICA - senza comunicazione il satellite è inutile!

#### 2. Raccolta Telemetria (Priorità Alta: 90)
**Cosa fa:** Raccoglie continuamente i dati dai sensori del satellite.
**Quando:** Ogni 100 millisecondi, in modo ripetitivo e continuo.
**Tempo massimo:** Deve completarsi entro 100 millisecondi, tipicamente ne impiega 60.
**Importanza:** Molto alta - dobbiamo sapere sempre cosa sta succedendo al satellite.

#### 3. Elaborazione Dati (Priorità Media-Alta: 85)
**Cosa fa:** Analizza ed elabora i dati raccolti dalla telemetria.
**Quando:** Ogni 200 millisecondi, in modo continuo.
**Tempo massimo:** Deve completarsi entro 200 millisecondi, tipicamente ne impiega 150.
**Importanza:** Alta - trasforma i dati grezzi in informazioni utili.

#### 4. Trasmissione a Terra (Priorità Alta: 92)
**Cosa fa:** Invia i dati elaborati alla stazione di terra.
**Quando:** Continuamente, con una pausa di 10 millisecondi tra una trasmissione e l'altra.
**Tempo massimo:** Deve completarsi entro 80 millisecondi, tipicamente ne impiega 50.
**Importanza:** CRITICA - i dati devono arrivare a terra!

### L'Ordine di Esecuzione (Dipendenze)

Le attività devono essere eseguite in un ordine preciso, come una catena di montaggio:

1. **Prima** si inizializza la comunicazione
2. **Poi** si può iniziare a raccogliere la telemetria
3. **Dopo** aver raccolto i dati, si possono elaborare
4. **Infine** si trasmettono i dati elaborati a terra

Ogni attività può iniziare solo quando quella precedente è terminata.

### La Gestione dei Guasti

Il sistema è progettato per essere robusto e gestire i problemi:

#### Se un'attività fallisce:
- Il sistema la **riavvia automaticamente**
- Prova fino a **3 volte**
- Aspetta sempre **più tempo** tra un tentativo e l'altro (backoff esponenziale)

#### Se un servizio si blocca:
- Il sistema lo **sostituisce** con uno nuovo
- Aspetta massimo **2 secondi** prima di dichiararlo morto

#### Se l'intero sistema va in crisi:
- Esegue un **riavvio completo**
- Salva lo stato ogni **5 secondi** per poter riprendere da dove si era fermato

#### Ridondanza per le attività critiche:
Le due attività più importanti (inizializzazione comunicazione e trasmissione a terra) hanno:
- **2 copie identiche** che girano in parallelo (replica attiva)
- Se una copia fallisce, l'altra continua a funzionare senza interruzioni

### In Sintesi

Questo sistema è come un **direttore d'orchestra** che coordina tre musicisti (i servizi) per eseguire quattro brani (le attività) in un ordine preciso, rispettando tempi rigorosi, e con un piano B pronto in caso qualcosa vada storto. Il tutto per garantire che il satellite possa comunicare con la Terra in modo affidabile e continuo.

---

## Guida per il Test Utente

### Obiettivo del Test
Verificare se un utente, leggendo solo la **descrizione in linguaggio naturale** sopra riportata, è in grado di utilizzare il tool DSL per ricreare la configurazione tecnica completa.

### Istruzioni per il Partecipante al Test

1. **Leggi attentamente** la sezione "Descrizione in Linguaggio Naturale"
2. **Apri il tool DSL** nel browser
3. **Compila tutti i 6 step** del wizard cercando di tradurre le informazioni dal linguaggio naturale ai campi tecnici
4. **Scarica il file YAML** generato alla fine

### Cosa Osservare Durante il Test

**Facilità d'uso:**
- Il partecipante riesce a capire quali informazioni inserire in ogni campo?
- Ci sono termini tecnici che creano confusione?
- La mappatura linguaggio naturale → campi tecnici è intuitiva?

**Completezza:**
- Il partecipante riesce a inserire tutte le informazioni?
- Qualche informazione viene saltata o fraintesa?

**Tempo:**
- Quanto tempo impiega per completare la configurazione?
- Ci sono step che richiedono più tempo di altri?

**Errori comuni:**
- Quali campi causano più errori di validazione?
- Ci sono valori che vengono interpretati male?

### Domande Post-Test

1. Quale step hai trovato più difficile? Perché?
2. C'erano termini tecnici che non conoscevi?
3. La descrizione in linguaggio naturale era chiara?
4. Cosa miglioreresti nell'interfaccia del tool?
5. Ti sei sentito sicuro/a che la configurazione fosse corretta?

### Metriche di Successo

- ✅ **Successo completo:** Configurazione identica a quella tecnica
- ⚠️ **Successo parziale:** Configurazione corretta ma con piccole differenze nei valori
- ❌ **Fallimento:** Configurazione incompleta o con errori significativi

### Note per il Valutatore

Confronta il file YAML generato dal partecipante con quello di riferimento, prestando attenzione a:
- Correttezza dei nomi e ID
- Valori numerici (priorità, deadline, memoria, ecc.)
- Relazioni di dipendenza tra task
- Configurazione della fault tolerance
- Completezza di tutti i servizi e task

---

## File di Riferimento Atteso

Il file YAML generato correttamente dovrebbe contenere:
- 1 configurazione global con nome, versione e descrizione
- 1 environment con risorse e configurazione real-time
- 3 services (telemetry_service, processing_service, comm_service)
- 4 tasks (task_init_comm, task_collect_telemetry, task_process_data, task_send_ground)
- 3 dependencies in sequenza
- Configurazione fault_tolerance completa con ridondanza per 2 task critici

---

**Data documento:** Novembre 2025  
**Versione:** 1.0  
**Autore:** Test Configuration Team
