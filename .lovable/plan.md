# Uploadable landing-page video

## What will change
- Add a **Landing page video** area to the studio panel with a video picker, preview, and save button.
- Store the uploaded video in the same protected media folder as the artwork and artist photo.
- Save the video location with the editable site content, so it follows whichever database is currently active.
- Make the homepage play the uploaded video automatically, while keeping the current studio video as the fallback.
- Accept common browser video formats and show clear upload errors.

## Technical details
- Add a reusable media upload helper and signed media URL lookup.
- Add `hero_video_path` to the external database setup content so migrated or newly configured databases support the setting.
- Keep uploads admin-only under the existing storage permissions.
- Verify the studio control and homepage playback in the running preview.
