-- Coordenador: campos de identificação e localização
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "rg" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cpf" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "imageUrl" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "voterTitle" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "zone" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "section" text;

-- Líder: campos de localização e atuação
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "localAtuacao" text;

-- Eleitor: título de eleitor
ALTER TABLE "voter" ADD COLUMN IF NOT EXISTS "voterTitle" text;
