# DropShare — Railway-ready file sharing

## Local
npm install
npm start

## Railway
This version supports:
- Up to 1 GB per uploaded file.
- Persistent storage through the DATA_DIR environment variable.
- Recommended Railway Volume mounted at `/data`.

Set:
DATA_DIR=/data

Then attach a Railway Volume to `/data`.

Important: Railway's current docs list a 0.5 GB default volume for Free/Trial, 5 GB for Hobby, and 50 GB for Pro. For 1 GB files plus multiple files, use enough persistent storage for your expected usage.
