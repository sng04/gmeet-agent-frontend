---
inclusion: manual
name: frontend-project-integration
description: Frontend integration guide for Project management API. Covers endpoints, request/response formats, and flows for creating, listing, updating projects, and managing user assignments.
---

# Frontend Project Integration Guide

## Overview

This document provides a complete guide for integrating frontend with Project management API. Projects are the main organizational unit that groups sessions, users, and bot credentials together.

Key concepts:
- **Project**: Container for sessions and user assignments
- **Project User**: Association between a user and a project
- **Bot Credential**: Each project can have one bot credential assigned for meeting bots

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
| `POST /projects` (Create) | ✅ Can create | ❌ No access |
| `GET /projects` (List) | ✅ See ALL projects | ✅ See ONLY assigned projects |
| `GET /projects/{id}` (Get) | ✅ Access ANY project | ✅ Access ONLY assigned projects |
| `PUT /projects/{id}` (Update) | ✅ Can update | ❌ No access |
| `PUT /projects/{id}` (Assign Bot Credential) | ✅ Can assign/unassign | ❌ No access |
| `DELETE /projects/{id}` (Delete) | ✅ Can delete (if no active sessions) | ❌ No access |
| `GET /projects/{id}/users` (List Users) | ✅ Can view | ❌ No access |
| `POST /project-users` (Assign User) | ✅ Can assign | ❌ No access |
| `DELETE /project-users/{id}` (Remove User) | ✅ Can remove | ❌ No access |

### How Access Control Works

**Admin Role:**
- Full access to all project operations
- Can see all projects in the system
- Can manage user assignments
- Can assign/unassign bot credentials

**User Role:**
- Can only see projects they are assigned to
- Cannot create, update, or delete projects
- Cannot manage user assignments
- Can create sessions for assigned projects (via Session API)

### Authorization Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│  Authorizer │────▶│   Lambda    │
│  + Token    │     │  (Cognito)  │     │  Function   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Extract:    │
                    │ - user_id   │
                    │ - groups    │
                    │   (admin/   │
                    │    user)    │
                    └─────────────┘
```

The authorizer extracts user context from the JWT token:
- `user_id`: User's unique identifier
- `groups`: Comma-separated list of Cognito groups (e.g., "admin" or "user")

Lambda functions check `is_admin = "admin" in groups` to determine access level.

---

## API Endpoints

### Project Endpoints

#### 1. Create Project
**POST** `/projects`

Creates a new project. **Admin only.**

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Request Body:**
```json
{
  "name": "Project Alpha",
  "description": "Main development project",
  "email": "project@company.com",
  "s3_arn": "arn:aws:s3:::bucket-name",
  "agent_id": "agent-uuid-here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `email` | string | Yes | Project contact email |
| `description` | string | No | Project description |
| `s3_arn` | string | No | S3 bucket ARN for storage |
| `agent_id` | string | No | Associated agent ID |

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project created successfully",
  "data": {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Project Alpha",
    "description": "Main development project",
    "email": "project@company.com",
    "s3_arn": "arn:aws:s3:::bucket-name",
    "agent_id": "agent-uuid-here",
    "created_at": "2024-01-15T10:30:00.000000+00:00",
    "updated_at": "2024-01-15T10:30:00.000000+00:00"
  }
}
```

**Error Responses:**
- `400`: Missing required fields (name, email)
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (not admin)
- `500`: Internal server error

---

#### 2. List Projects
**GET** `/projects`

Lists projects with pagination.

**Access Behavior:**
- **Admin**: Returns ALL projects in the system
- **User**: Returns ONLY projects the user is assigned to

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
  "message": "Projects retrieved successfully",
  "data": {
    "items": [
      {
        "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Project Alpha",
        "description": "Main development project",
        "email": "project@company.com",
        "s3_arn": "arn:aws:s3:::bucket-name",
        "bot_credential_id": "cred-uuid-here",
        "agent_id": "agent-uuid-here",
        "total_users": 4,
        "total_sessions": 12,
        "created_at": "2024-01-15T10:30:00.000000+00:00",
        "updated_at": "2024-01-15T10:30:00.000000+00:00"
      }
    ],
    "count": 1,
    "lastKey": "next-project-id"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `total_users` | integer | Number of users assigned to the project |
| `total_sessions` | integer | Number of sessions created in the project |

**Error Responses:**
- `401`: Unauthorized
- `500`: Internal server error

**Frontend Implementation:**
```javascript
// For admin: shows all projects
// For user: shows only assigned projects
// The backend handles filtering automatically based on token
async function loadProjects(limit = 20, lastKey = null) {
  const params = new URLSearchParams({ limit });
  if (lastKey) params.append('lastKey', lastKey);
  
  const response = await apiCall('GET', `/projects?${params}`);
  return response.data;
}
```

---

#### 3. Get Project
**GET** `/projects/{projectId}`

Gets a single project by ID.

**Access Behavior:**
- **Admin**: Can access ANY project
- **User**: Can ONLY access projects they are assigned to (returns 403 otherwise)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project retrieved successfully",
  "data": {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Project Alpha",
    "description": "Main development project",
    "email": "project@company.com",
    "s3_arn": "arn:aws:s3:::bucket-name",
    "bot_credential_id": "cred-uuid-here",
    "agent_id": "agent-uuid-here",
    "total_users": 4,
    "total_sessions": 12,
    "created_at": "2024-01-15T10:30:00.000000+00:00",
    "updated_at": "2024-01-15T10:30:00.000000+00:00"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `total_users` | integer | Number of users assigned to the project |
| `total_sessions` | integer | Number of sessions created in the project |

**Error Responses:**
- `400`: Project ID is required
- `401`: Unauthorized
- `403`: You don't have access to this project (user not assigned)
- `404`: Project not found
- `500`: Internal server error

---

#### 5. Delete Project
**DELETE** `/projects/{projectId}`

Soft deletes a project. **Admin only.**

**Validation:**
- Project must not have any active (live) sessions
- If active sessions exist, returns 409 Conflict

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project deleted successfully",
  "data": {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Project Alpha",
    "status": "deleted",
    "deleted_at": "2024-01-20T10:30:00.000000+00:00",
    "updated_at": "2024-01-20T10:30:00.000000+00:00"
  }
}
```

**Error Responses:**
- `400`: Project ID is required
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `404`: Project not found or already deleted
- `409`: Cannot delete project with active sessions. Please end all live sessions first.
- `500`: Internal server error

**Frontend Implementation:**
```javascript
async function deleteProject(projectId) {
  const confirmed = await confirmDialog(
    'Are you sure you want to delete this project? This action cannot be undone.'
  );
  if (!confirmed) return;
  
  try {
    const response = await apiCall('DELETE', `/projects/${projectId}`);
    if (response.status) {
      showSuccess('Project deleted successfully');
      refreshList();
    }
  } catch (error) {
    if (error.message.includes('active sessions')) {
      showError('Cannot delete project while sessions are live. Please end all active sessions first.');
    } else {
      showError(error.message);
    }
  }
}
```

---

#### 4. Update Project
**PUT** `/projects/{projectId}`

Updates project fields. **Admin only.**

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Request Body:**
```json
{
  "name": "Project Alpha Updated",
  "description": "Updated description",
  "email": "newemail@company.com",
  "s3_arn": "arn:aws:s3:::new-bucket",
  "bot_credential_id": "new-cred-uuid",
  "agent_id": "new-agent-uuid"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Project name |
| `description` | string | Project description |
| `email` | string | Project contact email |
| `s3_arn` | string | S3 bucket ARN |
| `bot_credential_id` | string | Bot credential ID (must be verified & active), set to `null` to unassign |
| `agent_id` | string | Agent ID, set to `null` to unassign |

**Bot Credential Validation:**
When assigning a bot credential, the system validates:
- Credential must exist
- Credential must have `verification_status: "verified"`
- Credential must have `available_status: "active"`

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project updated successfully",
  "data": {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Project Alpha Updated",
    "description": "Updated description",
    "email": "newemail@company.com",
    "s3_arn": "arn:aws:s3:::new-bucket",
    "bot_credential_id": "new-cred-uuid",
    "agent_id": "new-agent-uuid",
    "created_at": "2024-01-15T10:30:00.000000+00:00",
    "updated_at": "2024-01-16T14:00:00.000000+00:00"
  }
}
```

**Error Responses:**
- `400`: No update data provided / No valid fields to update / Bot credential validation errors
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `404`: Project not found / Bot credential not found
- `500`: Internal server error

---

### Project User Endpoints

#### 6. Get Project Users
**GET** `/projects/{projectId}/users`

Gets all users assigned to a project. **Admin only.**

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project users retrieved successfully",
  "data": {
    "users": [
      {
        "user_id": "user-uuid-1",
        "username": "sarah_chen",
        "email": "sarah@company.com",
        "role": "user",
        "project_user_id": "assignment-uuid-1",
        "assigned_at": "2024-01-15T10:30:00.000000+00:00"
      },
      {
        "user_id": "user-uuid-2",
        "username": "john_doe",
        "email": "john@company.com",
        "role": "user",
        "project_user_id": "assignment-uuid-2",
        "assigned_at": "2024-01-16T09:00:00.000000+00:00"
      }
    ],
    "total": 2
  }
}
```

**Response Fields:**
| Field | Description |
|-------|-------------|
| `user_id` | User's unique ID |
| `username` | User's display name (use this for NAME column) |
| `email` | User's email |
| `role` | User's role (user/admin) |
| `project_user_id` | Assignment ID (use this for removal) |
| `assigned_at` | When user was assigned |

**Error Responses:**
- `400`: Project ID is required
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `500`: Internal server error

---

#### 7. Assign User to Project
**POST** `/project-users`

Assigns a user to a project. **Admin only.**

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Request Body:**
```json
{
  "user_id": "user-uuid-here",
  "project_id": "project-uuid-here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string | Yes | User ID to assign |
| `project_id` | string | Yes | Project ID to assign to |

**Validation:**
- Project must exist
- User must exist
- User must not already be assigned to the project

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "User assigned to project successfully",
  "data": {
    "project_user_id": "assignment-uuid-here",
    "user_id": "user-uuid-here",
    "project_id": "project-uuid-here",
    "created_at": "2024-01-15T10:30:00.000000+00:00"
  }
}
```

**Error Responses:**
- `400`: Missing required fields (user_id, project_id)
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `404`: Project not found / User not found
- `409`: User is already assigned to this project
- `500`: Internal server error

---

#### 8. Remove User from Project
**DELETE** `/project-users/{projectUserId}`

Removes a user assignment from a project. **Admin only.**

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Important:** Use `project_user_id` from Get Project Users response, NOT `user_id`.

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "User removed from project successfully"
}
```

**Error Responses:**
- `400`: Project User ID is required
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `404`: Assignment not found
- `500`: Internal server error

---

## Frontend Pages

### 1. Projects List Page

**URL:** `/admin/projects` (admin) or `/projects` (user)

**Components:**
- Header with "Create Project" button (admin only)
- Search/filter bar
- Projects table
- Pagination

**Admin View:**
```html
<div class="page-header">
  <h1>Projects</h1>
  <button class="btn-primary">Create Project</button>
</div>

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Bot Credential</th>
      <th>Users</th>
      <th>Sessions</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Project Alpha</td>
      <td>project@company.com</td>
      <td><span class="badge badge-success">Assigned</span></td>
      <td>4 users</td>
      <td>12 sessions</td>
      <td>Jan 15, 2024</td>
      <td>
        <button>View</button>
        <button>Edit</button>
        <button>Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

**User View:**
```html
<div class="page-header">
  <h1>My Projects</h1>
  <!-- No Create button for users -->
</div>

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Description</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Project Alpha</td>
      <td>Main development project</td>
      <td>Jan 15, 2024</td>
      <td>
        <button>View</button>
        <!-- No Edit button for users -->
      </td>
    </tr>
  </tbody>
</table>
```

---

### 2. Create/Edit Project Modal (Admin Only)

**Components:**
- Form fields:
  - Name (required)
  - Email (required)
  - Description (optional)
  - S3 ARN (optional)
  - Bot Credential dropdown (optional)
  - Agent dropdown (optional)
- Submit button
- Cancel button

**Create Flow:**
```javascript
async function createProject(data) {
  if (!data.name || !data.email) {
    showError('Name and email are required');
    return;
  }
  
  const response = await apiCall('POST', '/projects', {
    name: data.name,
    email: data.email,
    description: data.description || '',
    s3_arn: data.s3Arn || '',
    agent_id: data.agentId || ''
  });
  
  if (response.status) {
    showSuccess('Project created successfully');
    refreshList();
    closeModal();
  }
}
```

**Update Flow:**
```javascript
async function updateProject(projectId, data) {
  const payload = {};
  
  if (data.name) payload.name = data.name;
  if (data.email) payload.email = data.email;
  if (data.description !== undefined) payload.description = data.description;
  if (data.s3Arn !== undefined) payload.s3_arn = data.s3Arn;
  if (data.botCredentialId !== undefined) {
    // Set to null to unassign, or credential ID to assign
    payload.bot_credential_id = data.botCredentialId || null;
  }
  if (data.agentId !== undefined) {
    payload.agent_id = data.agentId || null;
  }
  
  const response = await apiCall('PUT', `/projects/${projectId}`, payload);
  
  if (response.status) {
    showSuccess('Project updated successfully');
    refreshList();
    closeModal();
  }
}
```

---

### 3. Project Detail Page

**URL:** `/projects/{projectId}`

**Admin View Components:**
- Project info header
- Bot credential status card
- Users section with management
- Edit button

**User View Components:**
- Project info header (read-only)
- No user management section
- No edit button

**Project Info Card:**
```html
<div class="project-header">
  <h1>Project Alpha</h1>
  <p class="description">Main development project</p>
  <div class="meta">
    <span>📧 project@company.com</span>
    <span>📅 Created Jan 15, 2024</span>
  </div>
  <!-- Edit button only for admin -->
  <button class="btn-edit" v-if="isAdmin">Edit Project</button>
</div>
```

---

### 4. Project Users Section (Admin Only)

**Components:**
- Users count header
- "Add User" button
- Users table

**Table Structure:**
```html
<div class="users-section">
  <div class="section-header">
    <h3>4 users assigned</h3>
    <button class="btn-primary">Add User</button>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>NAME</th>
        <th>EMAIL</th>
        <th>ROLE</th>
        <th>ADDED</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>sarah_chen</td>
        <td>sarah@company.com</td>
        <td><span class="badge badge-user">user</span></td>
        <td>Feb 10, 2026</td>
        <td><button class="btn-danger-sm">Remove</button></td>
      </tr>
    </tbody>
  </table>
</div>
```

**Load Users Flow:**
```javascript
async function loadProjectUsers(projectId) {
  const response = await apiCall('GET', `/projects/${projectId}/users`);
  return response.data;
}
```

**Assign User Flow:**
```javascript
async function assignUser(projectId, userId) {
  const response = await apiCall('POST', '/project-users', {
    project_id: projectId,
    user_id: userId
  });
  
  if (response.status) {
    showSuccess('User assigned successfully');
    refreshUsers();
  }
}
```

**Remove User Flow:**
```javascript
async function removeUser(projectUserId) {
  const confirmed = await confirmDialog('Remove this user from the project?');
  if (!confirmed) return;
  
  // Use project_user_id, NOT user_id
  const response = await apiCall('DELETE', `/project-users/${projectUserId}`);
  
  if (response.status) {
    showSuccess('User removed successfully');
    refreshUsers();
  }
}
```

---

### 5. Add User to Project Modal (Admin Only)

**Components:**
- User search/select dropdown
- Submit button
- Cancel button

**Flow:**
```javascript
// First, load available users
async function loadAvailableUsers() {
  const response = await apiCall('GET', '/users');
  return response.data.items;
}

// Then assign selected user
async function handleAssignUser(projectId, selectedUserId) {
  try {
    await assignUser(projectId, selectedUserId);
    closeModal();
  } catch (error) {
    if (error.message.includes('already assigned')) {
      showError('User is already assigned to this project');
    } else {
      showError(error.message);
    }
  }
}
```

---

### Bot Credential Assignment

Bot credentials are assigned to projects via the Update Project endpoint. This section provides specific guidance for this flow.

#### Assign Bot Credential to Project
**PUT** `/projects/{projectId}`

Assigns a verified and active bot credential to a project. **Admin only.**

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Request Body:**
```json
{
  "bot_credential_id": "credential-uuid-here"
}
```

**Validation Rules:**
| Rule | Error Code | Error Message |
|------|------------|---------------|
| Credential must exist | 404 | Bot credential {id} not found |
| Credential must be verified | 400 | Bot credential {id} is not verified. Please verify the email before assigning to a project. |
| Credential must be active | 400 | Bot credential {id} is not active. Please activate the credential before assigning to a project. |

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project updated successfully",
  "data": {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Project Alpha",
    "bot_credential_id": "credential-uuid-here",
    "updated_at": "2024-01-16T14:00:00.000000+00:00"
  }
}
```

**Frontend Implementation:**
```javascript
async function assignBotCredential(projectId, credentialId) {
  try {
    const response = await apiCall('PUT', `/projects/${projectId}`, {
      bot_credential_id: credentialId
    });
    
    if (response.status) {
      showSuccess('Bot credential assigned successfully');
      refreshProject();
    }
  } catch (error) {
    if (error.message.includes('not verified')) {
      showError('Please verify the bot credential email first');
    } else if (error.message.includes('not active')) {
      showError('Please activate the bot credential first');
    } else {
      showError(error.message);
    }
  }
}
```

---

#### Unassign Bot Credential from Project
**PUT** `/projects/{projectId}`

Removes the bot credential assignment from a project. **Admin only.**

**Request Body:**
```json
{
  "bot_credential_id": null
}
```

**Success Response (200):**
```json
{
  "statusCode": 200,
  "status": true,
  "message": "Project updated successfully",
  "data": {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Project Alpha",
    "updated_at": "2024-01-16T14:00:00.000000+00:00"
  }
}
```

Note: The `bot_credential_id` field will be removed from the project record.

**Frontend Implementation:**
```javascript
async function unassignBotCredential(projectId) {
  const confirmed = await confirmDialog(
    'Remove bot credential from this project? Sessions will not be able to start meeting bots.'
  );
  if (!confirmed) return;
  
  const response = await apiCall('PUT', `/projects/${projectId}`, {
    bot_credential_id: null
  });
  
  if (response.status) {
    showSuccess('Bot credential removed from project');
    refreshProject();
  }
}
```

---

#### Bot Credential Assignment UI Component

**In Project Detail Page:**
```html
<div class="bot-credential-section">
  <h3>Bot Credential</h3>
  
  <!-- When assigned -->
  <div v-if="project.bot_credential_id" class="credential-card">
    <div class="credential-info">
      <span class="badge badge-assigned">Assigned</span>
      <span class="credential-email">bot@company.com</span>
    </div>
    <button class="btn-danger-sm" @click="unassignBotCredential">
      Remove
    </button>
  </div>
  
  <!-- When not assigned -->
  <div v-else class="credential-empty">
    <p>No bot credential assigned</p>
    <button class="btn-primary" @click="openAssignModal">
      Assign Bot Credential
    </button>
  </div>
</div>
```

**Assign Bot Credential Modal:**
```html
<div class="modal">
  <h3>Assign Bot Credential</h3>
  
  <div class="form-group">
    <label>Select Bot Credential</label>
    <select v-model="selectedCredentialId">
      <option value="">-- Select --</option>
      <!-- Only show verified & active credentials -->
      <option 
        v-for="cred in availableCredentials" 
        :key="cred.credential_id"
        :value="cred.credential_id"
      >
        {{ cred.email }} ({{ cred.platform }})
      </option>
    </select>
  </div>
  
  <div class="modal-actions">
    <button @click="closeModal">Cancel</button>
    <button class="btn-primary" @click="assignCredential">Assign</button>
  </div>
</div>
```

**Load Available Credentials:**
```javascript
async function loadAvailableCredentials() {
  const response = await apiCall('GET', '/bot-credentials');
  // Filter to only show verified and active credentials
  return response.data.items.filter(cred => 
    cred.verification_status === 'verified' && 
    cred.available_status === 'active'
  );
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
| 409 | Conflict | Show conflict message (e.g., user already assigned) |
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

---

## Conditional UI Based on Role

```javascript
// Check if user is admin
function isAdmin() {
  const token = localStorage.getItem('id_token');
  if (!token) return false;
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  const groups = payload['cognito:groups'] || [];
  return groups.includes('admin');
}

// Use in components
const showAdminFeatures = isAdmin();
```

```html
<!-- Conditional rendering example -->
<template>
  <div class="project-page">
    <!-- Admin-only: Create button -->
    <button v-if="isAdmin" @click="openCreateModal">Create Project</button>
    
    <!-- Admin-only: Edit button -->
    <button v-if="isAdmin" @click="openEditModal">Edit</button>
    
    <!-- Admin-only: Users section -->
    <div v-if="isAdmin" class="users-section">
      <h3>Project Users</h3>
      <!-- ... -->
    </div>
  </div>
</template>
```

---

## Status Badge Styling

```css
.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* Bot Credential Status */
.badge-assigned {
  background: #D1FAE5;
  color: #065F46;
}

.badge-not-assigned {
  background: #FEF3C7;
  color: #92400E;
}

/* User Role */
.badge-user {
  background: #DBEAFE;
  color: #1E40AF;
}

.badge-admin {
  background: #EDE9FE;
  color: #5B21B6;
}
```

---

## Summary

### Available Endpoints:
1. ✅ `POST /projects` - Create project (admin only)
2. ✅ `GET /projects` - List projects with user/session counts (admin: all, user: assigned only)
3. ✅ `GET /projects/{projectId}` - Get single project with user/session counts (admin: any, user: assigned only)
4. ✅ `PUT /projects/{projectId}` - Update project (admin only)
5. ✅ `PUT /projects/{projectId}` - Assign/unassign bot credential (admin only, via bot_credential_id field)
6. ✅ `DELETE /projects/{projectId}` - Delete project (admin only, requires no active sessions)
7. ✅ `GET /projects/{projectId}/users` - Get project users (admin only)
8. ✅ `POST /project-users` - Assign user to project (admin only)
9. ✅ `DELETE /project-users/{projectUserId}` - Remove user from project (admin only)

### Pages to Build:
1. Projects List Page (`/projects` or `/admin/projects`)
2. Create/Edit Project Modal (admin only)
3. Project Detail Page (`/projects/{projectId}`)
4. Project Users Section (admin only, within detail page)
5. Add User to Project Modal (admin only)
