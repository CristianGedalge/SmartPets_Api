# Design

Version 2026-11-18.1. Canonical document JSON web features/legal/content/legal.json, byte-identical Flutter assets/legal/legal.json. LegalPage /terminos and /privacidad under PublicLayout, footer links; registration links open new tab with noopener to preserve draft. Two required controlled checkboxes on web final step, disabled final submit until both true, submit guard plus payload flags/version. Flutter LegalScreen loads bundled JSON offline and links via Navigator, checkbox guards and disabled submit. Shared LegalLinks in AuthScreen and ProfileScreen.

API RegisterDto strict Equals true + current version string. AuthService validates again before any DB call and destructures legal flags out of user attributes. New aceptacion_legal table keyed by usuario_id cascading on physical user deletion, version_terminos/version_privacidad varchar40 and aceptado_en timestamptz server default. Insert using manager inside account transaction; no changes to usuario schema or previous users. TypeOrmModule.forFeature entity in AuthModule. Migration and HTTP/DTO/transaction tests; update old registration fixtures and Postman contract. No new endpoints required.

Validate web lint/build and browser checks; API lint/build/unit/integration isolated schema; Flutter analyze/test including unchecked, one checked, both checked payload and document navigation preserving draft.
