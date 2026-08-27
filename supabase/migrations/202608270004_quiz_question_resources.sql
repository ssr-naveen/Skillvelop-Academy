alter table public.quiz_questions
  add column if not exists resource_type text not null default 'none',
  add column if not exists resource_embed_url text not null default '';

update public.quiz_questions
set resource_type = 'image'
where image_r2_key <> ''
  and resource_type = 'none';

alter table public.quiz_questions
  drop constraint if exists quiz_questions_resource_type_check;

alter table public.quiz_questions
  add constraint quiz_questions_resource_type_check
  check (resource_type in ('none', 'image', 'pdf', 'document', 'presentation', 'iframe'));

alter table public.quiz_questions
  drop constraint if exists quiz_questions_resource_shape_check;

alter table public.quiz_questions
  add constraint quiz_questions_resource_shape_check
  check (
    (resource_type = 'none' and image_r2_key = '' and resource_embed_url = '')
    or (resource_type = 'iframe' and image_r2_key = '' and resource_embed_url <> '')
    or (resource_type in ('image', 'pdf', 'document', 'presentation') and image_r2_key <> '' and resource_embed_url = '')
  );

