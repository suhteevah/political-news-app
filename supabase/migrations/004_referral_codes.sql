-- Add referral_code to profiles
alter table public.profiles add column if not exists referral_code text unique;

-- Generate referral codes for existing users
update public.profiles
  set referral_code = lower(substr(md5(id::text || extract(epoch from now())::text), 1, 8))
  where referral_code is null;

-- Update the handle_new_user function to generate referral codes on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(substr(md5(new.id::text || extract(epoch from now())::text), 1, 8))
  );
  return new;
end;
$$ language plpgsql security definer;
