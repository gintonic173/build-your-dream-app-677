-- Derive the owner of every row on the server so the app never has to send it.
ALTER TABLE public.vehicles ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.charging_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.trips ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.maintenance_records ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.insights ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.chat_messages ALTER COLUMN user_id SET DEFAULT auth.uid();