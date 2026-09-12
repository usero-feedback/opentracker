# opentracker API

REST endpoints for integrating external applications with opentracker. Most agent workflows should use the MCP server instead (see
the README); these endpoints exist for plain HTTP callers.

## Authentication

All API requests require authentication using an API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

### API keys

Keys are managed under Profile (`/profile`), in the "API keys" section. You can hold several at once, each with a name (one per
agent or integration is a good habit). Click "Create key", name it, and copy the key: it is shown once and only a hash is stored.
Revoke a key from the same list if it leaks; the others keep working.

## Base URL

- Hosted: `https://tracker.usero.io`
- Self-hosted: wherever you deployed it
- Local: `http://localhost:5173`

## Endpoints

### GET /api/projects

List all projects accessible to the authenticated user.

**Request:**

```bash
curl -X GET https://tracker.usero.io/api/projects \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
	"projects": [
		{
			"id": "clxyz123abc",
			"name": "My Project"
		},
		{
			"id": "clxyz456def",
			"name": "Another Project"
		}
	]
}
```

### POST /api/projects/:projectId/stories

Create a new story in a project.

**Request:**

```bash
curl -X POST https://tracker.usero.io/api/projects/clxyz123abc/stories \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add user authentication",
    "description": "Implement OAuth2 login flow",
    "type": "feature",
    "labels": ["backend", "security"]
  }'
```

**Request Body:**

| Field         | Type     | Required | Default     | Description                                         |
| ------------- | -------- | -------- | ----------- | --------------------------------------------------- |
| `title`       | string   | Yes      | -           | Story title                                         |
| `description` | string   | No       | `""`        | Story description                                   |
| `type`        | string   | No       | `"feature"` | Story type: `feature`, `bug`, `chore`, or `release` |
| `labels`      | string[] | No       | `[]`        | Array of label names (must exist in project)        |
| `points`      | number   | No       | unestimated | Estimate: `1`, `2`, `4` or `8`                      |

**Response:**

```json
{
	"id": "s1701234567890",
	"number": 42,
	"url": "https://tracker.usero.io/tracker/clxyz123abc?story=42",
	"title": "Add user authentication"
}
```

**Response Fields:**

| Field    | Type   | Description                                  |
| -------- | ------ | -------------------------------------------- |
| `id`     | string | Unique story ID                              |
| `number` | number | Story number within the project              |
| `url`    | string | Direct link to view the story in opentracker |
| `title`  | string | Story title                                  |

**Notes:**

- Stories created via API are placed in the **Icebox** (unscheduled state)
- Labels that don't exist in the project will be ignored
- Story numbers are auto-incremented per project

## Error Responses

### 400 Bad Request

```json
{
	"error": "Validation error",
	"details": [
		{
			"code": "too_small",
			"minimum": 1,
			"type": "string",
			"path": ["title"],
			"message": "Title is required"
		}
	]
}
```

### 401 Unauthorized

```json
{
	"error": "Unauthorized. Please provide a valid API key in the Authorization header."
}
```

### 403 Forbidden

```json
{
	"error": "You do not have access to this project"
}
```

### 404 Not Found

```json
{
	"error": "Project not found"
}
```

### 500 Internal Server Error

```json
{
	"error": "Internal server error"
}
```

## Example: creating a story from another app

```javascript
const TRACKER_API_KEY = process.env.TRACKER_API_KEY
const TRACKER_PROJECT_ID = process.env.TRACKER_PROJECT_ID

async function createStoryFromFeedback(feedback) {
	const response = await fetch(`https://tracker.usero.io/api/projects/${TRACKER_PROJECT_ID}/stories`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${TRACKER_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			title: feedback.title,
			description: feedback.description,
			type: 'feature',
			labels: ['feedback'],
		}),
	})

	if (!response.ok) {
		const error = await response.json()
		throw new Error(error.error)
	}

	const story = await response.json()
	console.log(`Created story #${story.number}: ${story.url}`)
	return story
}
```

## Rate Limits

Currently, there are no explicit rate limits. However, please be respectful and avoid excessive requests.

## Support

Open an issue at https://github.com/usero-feedback/opentracker.
