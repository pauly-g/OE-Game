# HubSpot Integration Setup Guide

This guide will help you set up HubSpot integration for marketing consent and game analytics tracking.

## 1. HubSpot Account Setup

### Create a Private App in HubSpot

1. **Log into your HubSpot account**
2. **Navigate to Settings** (gear icon in top navigation)
3. **Go to Integrations > Private Apps**
4. **Click "Create a private app"**
5. **Configure the app:**
   - **Name**: "Order Editing Game Integration"
   - **Description**: "Integration for tracking game analytics and marketing consent"

### Set Required Scopes

Your private app needs these scopes:
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.schemas.contacts.read`

### Get Your Access Token

1. After creating the app, copy the **Access Token**
2. Also note your **Portal ID** (found in Account & Billing settings)

## 2. Create Custom Properties in HubSpot

You need to create these custom contact properties in HubSpot:

### Navigate to Properties
1. Go to **Settings > Properties**
2. Select **Contact properties**
3. Click **Create property** for each of the following:

### Required Custom Properties

| Property Name | Internal Name | Type | Description |
|---------------|---------------|------|-------------|
| Accepts Marketing | `accepts_marketing` | Single checkbox | Whether contact accepts marketing communications |
| Played Order Editing Game | `played_order_editing_game` | Single checkbox | Whether contact has played the game |
| Game High Score | `game_high_score` | Number | Highest score achieved in the game |
| First Game Play Date | `first_game_play_date` | Date picker | When contact first played the game |
| Last Game Play Date | `last_game_play_date` | Date picker | When the game was last played |
| Game Session Duration | `game_session_duration` | Number | Session duration in minutes |

### Property Configuration Example

For **Accepts Marketing**:
- **Label**: "Accepts Marketing"
- **Internal name**: `accepts_marketing`
- **Property type**: "Single checkbox"
- **Field type**: "Boolen"
- **Description**: "Whether the contact accepts marketing communications from Order Editing game"

## 3. Environment Variables Setup

Create a `.env.local` file in your project root:

```env
# HubSpot API Configuration
VITE_HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_HUBSPOT_PORTAL_ID=12345678
```

**Replace with your actual values:**
- `VITE_HUBSPOT_ACCESS_TOKEN`: Your private app access token
- `VITE_HUBSPOT_PORTAL_ID`: Your HubSpot portal ID

## 4. Integration Usage Examples

### Basic Marketing Consent

```typescript
import { handleMarketingConsent } from './utils/gameHubSpotIntegration';

// When user accepts marketing
await handleMarketingConsent(
  'user@example.com',
  'John',
  'Doe',
  true // accepts marketing
);
```

### Game Completion with Stats

```typescript
import { handleGameCompletion } from './utils/gameHubSpotIntegration';

// When game ends
await handleGameCompletion(
  'user@example.com',
  1250, // final score
  true // accepts marketing
);
```

### High Score Achievement

```typescript
import { handleHighScore } from './utils/gameHubSpotIntegration';

// When new high score is achieved
await handleHighScore(
  'user@example.com',
  1500 // new high score
);
```

### Session Tracking

```typescript
import { startGameSession, resetSession } from './utils/gameHubSpotIntegration';

// Start tracking when game begins
startGameSession();

// Reset when starting new game
resetSession();
```

## 5. Integration Points in Your Game

### Game Start
- Call `startGameSession()` when the game begins

### Marketing Consent Form
- Call `handleMarketingConsent()` when user submits consent form

### Game Over
- Call `handleGameCompletion()` with final stats

### High Score
- Call `handleHighScore()` when a new high score is achieved

### Settings/Profile Updates
- Call `updateContactMarketingConsent()` if user changes marketing preferences

## 6. Testing the Integration

### Validate Configuration

```typescript
import { validateHubSpotConfig, testHubSpotConnection } from './utils/hubspotIntegration';

// Check if environment variables are set
const config = validateHubSpotConfig();
if (!config.isValid) {
  console.error('HubSpot config errors:', config.errors);
}

// Test API connection
const isConnected = await testHubSpotConnection();
console.log('HubSpot connected:', isConnected);
```

### Test Contact Creation

1. Use a test email address
2. Play through the game
3. Accept marketing consent
4. Check your HubSpot contacts to verify the data was created/updated

## 7. Data Privacy Considerations

### GDPR Compliance
- Only collect data with explicit consent
- Provide clear opt-out mechanisms
- Honor data deletion requests

### Data Minimization
- Only collect necessary game and marketing data
- Don't store sensitive personal information

### Consent Management
- Track consent timestamps
- Allow users to withdraw consent
- Update HubSpot when consent changes

## 8. Troubleshooting

### Common Issues

**"HubSpot client not initialized"**
- Check environment variables are set correctly
- Verify access token is valid

**"Property does not exist" errors**
- Ensure all custom properties are created in HubSpot
- Check internal property names match exactly

**API rate limits**
- HubSpot has API rate limits
- The integration includes error handling for this

**CORS issues**
- HubSpot API calls should work from browser
- If issues persist, consider server-side proxy

### Debug Mode

Enable detailed logging by adding to console:
```javascript
localStorage.setItem('debug', 'hubspot');
```

## 9. Security Best Practices

### Environment Variables
- Never commit `.env.local` to version control
- Use different tokens for development/production
- Rotate access tokens regularly

### API Token Security
- Limit token scopes to minimum required
- Monitor token usage in HubSpot
- Revoke unused tokens

### Data Validation
- Validate email addresses before sending to HubSpot
- Sanitize user input
- Handle API errors gracefully

## 10. Monitoring and Analytics

### HubSpot Reporting
- Create custom reports for game analytics
- Track marketing consent rates
- Monitor user engagement metrics

### Error Monitoring
- Log integration errors
- Set up alerts for failed API calls
- Monitor API usage and limits

This integration will help you track user engagement, manage marketing consent, and build valuable customer data in HubSpot! 