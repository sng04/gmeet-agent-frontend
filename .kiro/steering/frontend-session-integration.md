---
inclusion: manual
name: frontend-session-integration
description: Frontend integration guide for Session management API. Covers endpoints, request/response formats, and flows for creating sessions, managing meeting bots, viewing transcripts, and session lifecycle.
---

# Frontend Session Integration Guide

## Overview

This document provides a complete guide for integrating frontend with Session management API. Sessions represent meeting recordings within a project, with optional meeting bot integration for live transcription.

Key concepts:
- **Session**: A meeting recording linked to a project
- **Meeting Bot**: Automated bot that joins meetings to capture audio/transcripts
- **Bot Status**: Lifecycle state of the meeting bot (pending, queued, starting, running, stopping, stopped, completed, failed)
- **Transcripts**: Real-time speech-to-text output from the meeting bot

## Base URL

```
{API_GATEWAY_URL}/{stage}
```

Example: `https://abc123.execute-api.ap-southeast-1.amazonaws.com/dev`

---

## Access Control

### Role-Based Access Summary

| Endpoint | Admin | User |
|----------|-------|------|
| `POST /sessions` (Create) | ✅ Any project | ✅ Assigned projects only |
| `GET /sessions` (List) | ✅ See ALL sessions | ✅ See sessions from assigned projects |
| `GET /sessions/{id}` (Get) | ✅ Any session | ✅ Assigned projects only |
| `PUT /sessions/{id}` (Update) | ✅ Any session | ✅ Assigned projects only |
| `DELETE /sessions/{id}` (Delete) | ✅ Any session | ✅ Assigned projects only |
| `GET /projects/{id}/sessions` (Project Sessions) | ✅ Any project | ✅ Assigned projects only |
| `POST /sessions/{id}/stop-bot` (Stop Bot) | ✅ Any session | ✅ Assigned projects only |
| `GET /sessions/{id}/bot-status` (Bot Status) | ✅ Any session | ✅ Assigned projects only |
| `GET /sessions/{id}/transcripts` (Transcripts) | ✅ Any session | ✅ Assigned projects only |

### How Access Control Works

**Admin Role:**
- Full access to all session operations across all projects
- Can create sessions for any project
- Can manage meeting bots for any session

**User Role:**
- Can only access sessions from projects they are assigned to
- Can create sessions for assigned projects
- Can manage meeting bots for sessions in assigned projects

---

## Bot Status Lifecycle

```
┌─────────┐    ┌────────┐    ┌──────────┐    ┌─────────┐
│  none   │───▶│ pending│───▶│  queued  │───▶│starting │
└─────────┘    └────────┘    └──────────┘    └─────────┘
     │                                             │
     │ (no meeting_link)                           ▼
     │                                       ┌─────────┐
     └──────────────────────────────────────▶│ running │
                                             └─────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────┐
                    ▼                              ▼                      ▼
              ┌──────────┐                  ┌───────────┐          ┌────────┐
              │ stopping │─────────────────▶│ completed │          │ failed │
              └──────────┘                  └───────────┘          └────────┘
                    │
                    ▼
              ┌─────────┐
              │ stopped │
              └─────────┘
```

| Status | Description |
|--------|-------------|
| `none` | No meeting link provided, bot not started |
| `pending` | Meeting link provided, waiting to dispatch |
| `queued` | Sent to warm pool queue, waiting for container |
| `starting` | ECS task starting (cold start mode) |
| `running` | Bot is active in the meeting |
| `stopping` | Stop signal sent, bot is leaving meeting |
| `stopped` | Bot stopped by user request |
| `completed` | Meeting ended normally |
| `failed` | Bot encountered an error |

---

## API Endpoints

### Session CRUD Endpoints

#### 1. Create Session
**POST** `/sessions`

Creates a new session linked to a project. Optionally starts a meeting bot if `meeting_link` is provided.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "project_id": "project-uuid-here",
  "name": "Weekly Standup Meeting",
  "description": "Team sync meeting",
  "meeting_link": "https://meet.google.com/abc-defg-hij"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | string | Yes | Project ID to link session to |
| `name` | string | Yes | Session name |
| `description` | string | No | Session description |
| `meeting_link` | string | No | Meeting URL (Google Meet, Zoom, etc.) - if provided, bot will be dispatched |

**Bot Dispatch Behavior:**
- If `meeting_link` is provided:
  - System validates project has a verified & active bot credential
  - Bot is dispatched via warm pool (if available) or cold start
  - `bot_status` will be `queued` or `starting`
- If `meeting_link` is NOT provided:
  - No bot is started
  - `bot_status` will be `none`

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Session created successfully",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "project_id": "project-uuid-here",
    "name": "Weekly Standup Meeting",
    "description": "Team sync meeting",
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "bot_status": "queued",
    "is_active": "inactive",
    "dispatch_mode": "warm_pool",
    "task_arn": null,
    "start_time": null,
    "end_time": null,
    "created_at": "2024-01-15T10:30:00.000000+00:00",
    "updated_at": "2024-01-15T10:30:00.000000+00:00"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Unique session identifier |
| `project_id` | string | Linked project ID |
| `name` | string | Session name |
| `description` | string | Session description |
| `meeting_link` | string | Meeting URL |
| `bot_status` | string | Current bot status |
| `is_active` | string | Session active state ("active"/"inactive") |
| `dispatch_mode` | string | How bot was dispatched ("warm_pool"/"cold_start") |
| `task_arn` | string | ECS task ARN (for cold start mode) |
| `start_time` | string | When meeting started |
| `end_time` | string | When meeting ended |

**Error Responses:**
- `400`: Missing required fields / Project deleted / Bot credential issues
- `401`: Unauthorized
- `403`: You don't have access to this project
- `404`: Project not found
- `500`: Internal server error

**Bot Credential Error Messages:**
| Error | Meaning |
|-------|---------|
| "Project does not have a bot credential assigned" | Admin needs to assign a bot credential to the project |
| "Bot credential {id} is not verified" | Bot credential email needs verification |
| "Bot credential {id} is not active" | Bot credential needs to be activated |

---

#### 2. List Sessions
**GET** `/sessions`

Lists all sessions with pagination.

**Access Behavior:**
- **Admin**: Returns ALL sessions in the system
- **User**: Returns sessions from assigned projects only

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return (default: 20, max: 100) |
| `lastKey` | string | Pagination key from previous response |

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Sessions retrieved successfully",
  "data": {
    "items": [
      {
        "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "project_id": "project-uuid-here",
        "name": "Weekly Standup Meeting",
        "description": "Team sync meeting",
        "meeting_link": "https://meet.google.com/abc-defg-hij",
        "bot_status": "completed",
        "is_active": "inactive",
        "created_at": "2024-01-15T10:30:00.000000+00:00",
        "updated_at": "2024-01-15T11:30:00.000000+00:00"
      }
    ],
    "count": 1,
    "lastKey": "next-session-id"
  }
}
```

---

#### 3. Get Session
**GET** `/sessions/{sessionId}`

Gets a single session by ID.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Session retrieved successfully",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "project_id": "project-uuid-here",
    "project_name": "Project Alpha",
    "name": "Weekly Standup Meeting",
    "description": "Team sync meeting",
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "bot_status": "running",
    "is_active": "active",
    "dispatch_mode": "warm_pool",
    "task_arn": "arn:aws:ecs:...",
    "start_time": "2024-01-15T10:35:00.000000+00:00",
    "end_time": null,
    "created_at": "2024-01-15T10:30:00.000000+00:00",
    "updated_at": "2024-01-15T10:35:00.000000+00:00"
  }
}
```

**Note:** Response includes `project_name` for display purposes.

**Error Responses:**
- `400`: Missing sessionId path parameter
- `401`: Unauthorized
- `403`: You don't have access to this session
- `404`: Session not found
- `500`: Internal server error

---

#### 4. Get Project Sessions
**GET** `/projects/{projectId}/sessions`

Gets all sessions for a specific project.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return (default: 20, max: 100) |
| `lastKey` | string | Pagination key from previous response |

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project sessions retrieved successfully",
  "data": {
    "project_id": "project-uuid-here",
    "items": [
      {
        "session_id": "session-uuid-1",
        "project_id": "project-uuid-here",
        "name": "Weekly Standup Meeting",
        "bot_status": "completed",
        "created_at": "2024-01-15T10:30:00.000000+00:00"
      },
      {
        "session_id": "session-uuid-2",
        "project_id": "project-uuid-here",
        "name": "Sprint Planning",
        "bot_status": "running",
        "created_at": "2024-01-16T09:00:00.000000+00:00"
      }
    ],
    "count": 2,
    "lastKey": "next-session-id"
  }
}
```

**Error Responses:**
- `400`: Missing projectId path parameter
- `401`: Unauthorized
- `403`: You don't have access to this project
- `404`: Project not found
- `500`: Internal server error

---

#### 5. Update Session
**PUT** `/sessions/{sessionId}`

Updates session fields.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Updated Meeting Name",
  "description": "Updated description",
  "meeting_link": "https://meet.google.com/new-link",
  "status": "completed",
  "start_time": "2024-01-15T10:35:00.000000+00:00",
  "end_time": "2024-01-15T11:30:00.000000+00:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Session name |
| `description` | string | Session description |
| `meeting_link` | string | Meeting URL |
| `status` | string | Session status |
| `start_time` | string | Meeting start time (ISO 8601) |
| `end_time` | string | Meeting end time (ISO 8601) |
| `project_id` | string | Move session to different project |

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Session updated successfully",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Updated Meeting Name",
    "description": "Updated description",
    "updated_at": "2024-01-15T12:00:00.000000+00:00"
  }
}
```

**Error Responses:**
- `400`: No update data provided / No valid fields to update
- `401`: Unauthorized
- `403`: You don't have access to this session
- `404`: Session not found
- `500`: Internal server error

---

#### 6. Delete Session
**DELETE** `/sessions/{sessionId}`

Deletes a session.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Session deleted successfully"
}
```

**Error Responses:**
- `400`: Missing sessionId path parameter
- `401`: Unauthorized
- `403`: You don't have access to this session
- `404`: Session not found
- `500`: Internal server error

---

### Meeting Bot Endpoints

#### 7. Stop Meeting Bot
**POST** `/sessions/{sessionId}/stop-bot`

Stops the meeting bot for a session.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Behavior by Dispatch Mode:**
- **Warm Pool Mode**: Signals container to stop current meeting (container returns to idle)
- **Cold Start Mode**: Stops the ECS task entirely

**Success Response (200) - Warm Pool:**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Stop signal sent to meeting bot",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "warm_pool",
    "message": "Container will stop current meeting and return to idle state"
  }
}
```

**Success Response (200) - Cold Start:**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Meeting bot stopped successfully",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "cold_start"
  }
}
```

**Error Responses:**
- `400`: Session ID is required / Bot is already {status} / No active bot task
- `401`: Unauthorized
- `403`: You don't have access to this session
- `404`: Session not found
- `500`: Failed to stop meeting bot

---

#### 8. Get Bot Status
**GET** `/sessions/{sessionId}/bot-status`

Gets detailed bot status including ECS task information.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Bot status retrieved successfully",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "bot_status": "running",
    "task_arn": "arn:aws:ecs:ap-southeast-1:123456789:task/cluster/task-id",
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "ecs_task": {
      "task_arn": "arn:aws:ecs:...",
      "last_status": "RUNNING",
      "desired_status": "RUNNING",
      "started_at": "2024-01-15T10:35:00.000000+00:00",
      "stopped_at": null,
      "stopped_reason": null,
      "cpu": "1024",
      "memory": "2048"
    }
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `bot_status` | string | Current bot status from session record |
| `task_arn` | string | ECS task ARN |
| `meeting_link` | string | Meeting URL |
| `ecs_task` | object | Detailed ECS task info (if available) |
| `ecs_task.last_status` | string | ECS task status (PENDING, RUNNING, STOPPED) |
| `ecs_task.started_at` | string | When task started |
| `ecs_task.stopped_at` | string | When task stopped |
| `ecs_task.stopped_reason` | string | Why task stopped |

**Error Responses:**
- `400`: Session ID is required
- `401`: Unauthorized
- `403`: You don't have access to this session
- `404`: Session not found
- `500`: Internal server error

---

#### 9. Get Session Transcripts
**GET** `/sessions/{sessionId}/transcripts`

Gets transcripts for a session with pagination.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return (default: 50, max: 100) |
| `lastKey` | string | Pagination key (timestamp) from previous response |

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Transcripts retrieved successfully",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "items": [
      {
        "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "timestamp": "2024-01-15T10:35:15.123456+00:00",
        "speaker": "John Doe",
        "text": "Good morning everyone, let's start the meeting.",
        "confidence": 0.95
      },
      {
        "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "timestamp": "2024-01-15T10:35:22.456789+00:00",
        "speaker": "Jane Smith",
        "text": "Thanks John. I have some updates on the project.",
        "confidence": 0.92
      }
    ],
    "count": 2,
    "lastKey": "2024-01-15T10:35:22.456789+00:00"
  }
}
```

**Transcript Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | When the speech was captured (ISO 8601) |
| `speaker` | string | Speaker name (if identified) |
| `text` | string | Transcribed text |
| `confidence` | number | Transcription confidence score (0-1) |

**Error Responses:**
- `400`: Session ID is required
- `401`: Unauthorized
- `403`: You don't have access to this session
- `404`: Session not found
- `500`: Internal server error

---

## Frontend Pages

### 1. Sessions List Page

**URL:** `/sessions` or `/projects/{projectId}/sessions`

**Components:**
- Header with "Create Session" button
- Filter by project (admin only)
- Sessions table with bot status indicators
- Pagination

**Table Structure:**
```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Project</th>
      <th>Bot Status</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Weekly Standup Meeting</td>
      <td>Project Alpha</td>
      <td><span class="badge badge-running">Running</span></td>
      <td>Jan 15, 2024 10:30 AM</td>
      <td>
        <button>View</button>
        <button>Stop Bot</button>
        <button>Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

**Load Sessions Flow:**
```javascript
// Load all sessions (admin sees all, user sees assigned projects only)
async function loadSessions(limit = 20, lastKey = null) {
  const params = new URLSearchParams({ limit });
  if (lastKey) params.append('lastKey', lastKey);
  
  const response = await apiCall('GET', `/sessions?${params}`);
  return response.data;
}

// Load sessions for specific project
async function loadProjectSessions(projectId, limit = 20, lastKey = null) {
  const params = new URLSearchParams({ limit });
  if (lastKey) params.append('lastKey', lastKey);
  
  const response = await apiCall('GET', `/projects/${projectId}/sessions?${params}`);
  return response.data;
}
```

---

### 2. Create Session Modal

**Components:**
- Project selector (dropdown)
- Session name (required)
- Description (optional)
- Meeting link (optional)
- Submit button

**Create Flow:**
```javascript
async function createSession(data) {
  if (!data.projectId || !data.name) {
    showError('Project and name are required');
    return;
  }
  
  try {
    const response = await apiCall('POST', '/sessions', {
      project_id: data.projectId,
      name: data.name,
      description: data.description || '',
      meeting_link: data.meetingLink || ''
    });
    
    if (response.status) {
      const session = response.data;
      
      // Show appropriate message based on bot status
      if (session.bot_status === 'queued' || session.bot_status === 'starting') {
        showSuccess('Session created! Meeting bot is starting...');
      } else if (session.bot_status === 'none') {
        showSuccess('Session created (no meeting link provided)');
      } else {
        showSuccess('Session created successfully');
      }
      
      refreshList();
      closeModal();
    }
  } catch (error) {
    // Handle bot credential errors
    if (error.message.includes('bot credential')) {
      showError('Cannot start bot: ' + error.message);
    } else {
      showError(error.message);
    }
  }
}
```

---

### 3. Session Detail Page

**URL:** `/sessions/{sessionId}`

**Components:**
- Session info header
- Bot status card with controls
- Transcripts section (if bot has run)

**Session Header:**
```html
<div class="session-header">
  <div class="breadcrumb">
    <a href="/projects">Projects</a> / 
    <a href="/projects/{projectId}">Project Alpha</a> / 
    <span>Weekly Standup Meeting</span>
  </div>
  
  <h1>Weekly Standup Meeting</h1>
  <p class="description">Team sync meeting</p>
  
  <div class="meta">
    <span>📅 Created Jan 15, 2024</span>
    <span>🔗 <a href="https://meet.google.com/...">Meeting Link</a></span>
  </div>
  
  <div class="actions">
    <button @click="editSession">Edit</button>
    <button @click="deleteSession" class="btn-danger">Delete</button>
  </div>
</div>
```

---

### 4. Bot Status Card

**Components:**
- Status indicator with icon
- Start/Stop button based on status
- ECS task details (expandable)

**Bot Status Card:**
```html
<div class="bot-status-card">
  <div class="status-header">
    <h3>Meeting Bot</h3>
    <span :class="'badge badge-' + botStatus">{{ botStatusLabel }}</span>
  </div>
  
  <!-- When bot is running -->
  <div v-if="isRunning" class="bot-running">
    <p>Bot is active in the meeting</p>
    <div class="ecs-info" v-if="ecsTask">
      <small>Started: {{ formatDate(ecsTask.started_at) }}</small>
    </div>
    <button @click="stopBot" class="btn-danger">Stop Bot</button>
  </div>
  
  <!-- When bot is starting/queued -->
  <div v-else-if="isStarting" class="bot-starting">
    <div class="spinner"></div>
    <p>Bot is starting...</p>
    <small>Mode: {{ session.dispatch_mode }}</small>
  </div>
  
  <!-- When bot is stopped/completed -->
  <div v-else-if="isStopped" class="bot-stopped">
    <p>Bot has finished</p>
    <small v-if="ecsTask?.stopped_reason">Reason: {{ ecsTask.stopped_reason }}</small>
  </div>
  
  <!-- When no bot -->
  <div v-else class="bot-none">
    <p>No meeting link provided</p>
    <small>Add a meeting link to start the bot</small>
  </div>
</div>
```

**Bot Status Logic:**
```javascript
const botStatusConfig = {
  none: { label: 'No Bot', color: 'gray', canStop: false },
  pending: { label: 'Pending', color: 'yellow', canStop: false },
  queued: { label: 'Queued', color: 'blue', canStop: false },
  starting: { label: 'Starting', color: 'blue', canStop: false },
  running: { label: 'Running', color: 'green', canStop: true },
  stopping: { label: 'Stopping', color: 'yellow', canStop: false },
  stopped: { label: 'Stopped', color: 'gray', canStop: false },
  completed: { label: 'Completed', color: 'green', canStop: false },
  failed: { label: 'Failed', color: 'red', canStop: false },
};

function getBotStatusConfig(status) {
  return botStatusConfig[status] || { label: status, color: 'gray', canStop: false };
}
```

**Stop Bot Flow:**
```javascript
async function stopBot(sessionId) {
  const confirmed = await confirmDialog(
    'Stop the meeting bot? The bot will leave the meeting.'
  );
  if (!confirmed) return;
  
  try {
    const response = await apiCall('POST', `/sessions/${sessionId}/stop-bot`);
    
    if (response.status) {
      showSuccess(response.message);
      refreshBotStatus();
    }
  } catch (error) {
    if (error.message.includes('already')) {
      showWarning(error.message);
    } else {
      showError(error.message);
    }
  }
}
```

**Poll Bot Status:**
```javascript
let pollInterval = null;

function startPollingBotStatus(sessionId) {
  // Poll every 5 seconds while bot is active
  pollInterval = setInterval(async () => {
    const response = await apiCall('GET', `/sessions/${sessionId}/bot-status`);
    
    if (response.status) {
      updateBotStatus(response.data);
      
      // Stop polling if bot is in terminal state
      const terminalStates = ['none', 'stopped', 'completed', 'failed'];
      if (terminalStates.includes(response.data.bot_status)) {
        stopPollingBotStatus();
      }
    }
  }, 5000);
}

function stopPollingBotStatus() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
```

---

### 5. Transcripts Section

**Components:**
- Transcript list with speaker and timestamp
- Auto-scroll for live transcripts
- Load more button for pagination

**Transcripts UI:**
```html
<div class="transcripts-section">
  <div class="section-header">
    <h3>Transcripts</h3>
    <span class="count">{{ transcripts.length }} entries</span>
  </div>
  
  <div class="transcript-list" ref="transcriptList">
    <div 
      v-for="transcript in transcripts" 
      :key="transcript.timestamp"
      class="transcript-item"
    >
      <div class="transcript-meta">
        <span class="speaker">{{ transcript.speaker || 'Unknown' }}</span>
        <span class="timestamp">{{ formatTime(transcript.timestamp) }}</span>
      </div>
      <p class="transcript-text">{{ transcript.text }}</p>
    </div>
  </div>
  
  <button 
    v-if="hasMoreTranscripts" 
    @click="loadMoreTranscripts"
    class="btn-secondary"
  >
    Load More
  </button>
</div>
```

**Load Transcripts Flow:**
```javascript
async function loadTranscripts(sessionId, lastKey = null) {
  const params = new URLSearchParams({ limit: 50 });
  if (lastKey) params.append('lastKey', lastKey);
  
  const response = await apiCall('GET', `/sessions/${sessionId}/transcripts?${params}`);
  
  if (response.status) {
    if (lastKey) {
      // Append to existing transcripts
      transcripts.value.push(...response.data.items);
    } else {
      // Replace transcripts
      transcripts.value = response.data.items;
    }
    
    lastTranscriptKey.value = response.data.lastKey || null;
  }
}

// Poll for new transcripts while bot is running
function startPollingTranscripts(sessionId) {
  transcriptPollInterval = setInterval(async () => {
    // Get latest transcripts (no lastKey = from beginning, sorted by timestamp)
    await loadTranscripts(sessionId);
    
    // Auto-scroll to bottom
    scrollToBottom();
  }, 3000);
}
```

---

## Response Format Standard

All API responses follow this format:

```json
{
  "statusCode": number,
  "status": boolean,
  "message": string,
  "data": object
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response data |
| 400 | Bad Request | Show validation error |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show "access denied" message |
| 404 | Not Found | Show "not found" message |
| 500 | Server Error | Show generic error |

### Frontend Error Handling Example

```javascript
async function apiCall(method, url, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    const data = await response.json();
    
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
      return;
    }
    
    if (response.status === 403) {
      showError('You do not have permission to perform this action');
      return;
    }
    
    if (!data.status) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```