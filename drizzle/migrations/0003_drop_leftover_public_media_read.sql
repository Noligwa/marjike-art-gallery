-- A second, older public-read rule on the media bucket was left in place;
-- signed links are created by the site's server, so visitors need no
-- direct read access at all.
drop policy if exists "Public can read artwork images" on storage.objects;