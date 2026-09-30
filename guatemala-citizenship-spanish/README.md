# Guatemala Citizenship Spanish Lab

Standalone study app inside the BatumHub GitHub Pages repository.

## Features
- 12-week Spanish + Guatemala civics curriculum
- Browser-local progress dashboard and streaks
- Spaced-repetition vocabulary deck
- Guatemala civics quizzes
- Citizenship interview prompts with Spanish TTS
- Busuu and Drops study logging
- JSON export/import for moving progress between work/home computers

## Integration note
Busuu consumer subscriptions do not expose a documented personal-progress API. Busuu's documented API is part of its Business/LMS offering. Drops does not expose a documented personal progress API. Therefore this app uses safe manual study logging and links to each service, without requesting or storing account passwords.

## Data
All progress is stored in browser localStorage under `gtCitizenLab.v1`. No password or third-party account credential is collected.
