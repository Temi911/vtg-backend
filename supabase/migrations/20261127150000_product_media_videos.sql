-- Let suppliers attach videos (MP4/WEBM/MOV, up to 50 MB) to products alongside photos.
-- The app enforces 5 MB per photo and 50 MB per video; the bucket cap is the video maximum.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
 where id = 'vtg-product-images';
