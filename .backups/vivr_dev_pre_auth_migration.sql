--
-- PostgreSQL database dump
--

\restrict 0vXyr6OXf9NHJpOnzCA2ucPTBcsaEahRmLwscguhtiS4wWkrM0xcnzqjkMxnYDD

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: vivr_app
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO vivr_app;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: vivr_app
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO vivr_app;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: vivr_app
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO vivr_app;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: vivr_app
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: actors; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.actors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    organization_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.actors OWNER TO vivr_app;

--
-- Name: inventory_import_batches; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.inventory_import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_name text NOT NULL,
    source_hash text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL,
    summary_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT import_batches_mode_check CHECK ((mode = ANY (ARRAY['dry_run'::text, 'commit'::text]))),
    CONSTRAINT import_batches_status_check CHECK ((status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text])))
);


ALTER TABLE public.inventory_import_batches OWNER TO vivr_app;

--
-- Name: inventory_import_rows; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.inventory_import_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    line_number integer NOT NULL,
    raw_value_json jsonb NOT NULL,
    normalized_value_json jsonb,
    result text NOT NULL,
    error_code text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT import_rows_result_check CHECK ((result = ANY (ARRAY['accepted'::text, 'rejected'::text, 'duplicate'::text, 'missing'::text, 'conflict'::text])))
);


ALTER TABLE public.inventory_import_rows OWNER TO vivr_app;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organizations OWNER TO vivr_app;

--
-- Name: star_numbers; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.star_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number_code text NOT NULL,
    display_number text NOT NULL,
    format_version integer DEFAULT 1 NOT NULL,
    category text NOT NULL,
    status text NOT NULL,
    memorability_score integer,
    pattern_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_batch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT star_numbers_category_check CHECK ((category = ANY (ARRAY['silver'::text, 'gold'::text, 'platinum'::text, 'diamond'::text]))),
    CONSTRAINT star_numbers_display_number_check CHECK ((display_number = ('*'::text || number_code))),
    CONSTRAINT star_numbers_format_version_check CHECK ((format_version >= 1)),
    CONSTRAINT star_numbers_status_check CHECK ((status = ANY (ARRAY['available'::text, 'reserved'::text, 'sold'::text, 'suspended'::text, 'released'::text, 'retired'::text])))
);


ALTER TABLE public.star_numbers OWNER TO vivr_app;

--
-- Name: vivr_versions; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.vivr_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vivr_id uuid NOT NULL,
    sequence integer NOT NULL,
    config_json jsonb NOT NULL,
    published_at timestamp with time zone,
    published_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vivr_versions_sequence_check CHECK ((sequence >= 1))
);


ALTER TABLE public.vivr_versions OWNER TO vivr_app;

--
-- Name: vivrs; Type: TABLE; Schema: public; Owner: vivr_app
--

CREATE TABLE public.vivrs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    brand_color text DEFAULT '#4154a3'::text NOT NULL,
    theme_mode text DEFAULT 'light'::text NOT NULL,
    logo_image_url text,
    cover_image_url text,
    current_draft_version_id uuid,
    current_published_version_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vivrs_brand_color_check CHECK ((brand_color ~ '^#[0-9a-fA-F]{6}$'::text)),
    CONSTRAINT vivrs_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT vivrs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
    CONSTRAINT vivrs_theme_mode_check CHECK ((theme_mode = ANY (ARRAY['light'::text, 'dark'::text])))
);


ALTER TABLE public.vivrs OWNER TO vivr_app;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: vivr_app
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: vivr_app
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	12d01c8c3072ea1b94e2749fddcc93cb03b37a5d7fd94a61bd5b4ef015ca88f8	1788924032575
2	a21648ecd6e0d079e36cf2e15f83d898b37c5eb47c7e7cc22a0750faa1c1c24e	1788945806360
\.


--
-- Data for Name: actors; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.actors (id, user_id, organization_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_import_batches; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.inventory_import_batches (id, source_name, source_hash, mode, status, summary_json, actor_id, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_import_rows; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.inventory_import_rows (id, batch_id, line_number, raw_value_json, normalized_value_json, result, error_code, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.organizations (id, name, slug, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: star_numbers; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.star_numbers (id, number_code, display_number, format_version, category, status, memorability_score, pattern_tags, source_batch_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vivr_versions; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.vivr_versions (id, vivr_id, sequence, config_json, published_at, published_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: vivrs; Type: TABLE DATA; Schema: public; Owner: vivr_app
--

COPY public.vivrs (id, organization_id, slug, title, description, status, brand_color, theme_mode, logo_image_url, cover_image_url, current_draft_version_id, current_published_version_id, created_at, updated_at) FROM stdin;
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: vivr_app
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 2, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: vivr_app
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: actors actors_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_pkey PRIMARY KEY (id);


--
-- Name: inventory_import_batches inventory_import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.inventory_import_batches
    ADD CONSTRAINT inventory_import_batches_pkey PRIMARY KEY (id);


--
-- Name: inventory_import_rows inventory_import_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.inventory_import_rows
    ADD CONSTRAINT inventory_import_rows_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: star_numbers star_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.star_numbers
    ADD CONSTRAINT star_numbers_pkey PRIMARY KEY (id);


--
-- Name: vivr_versions vivr_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivr_versions
    ADD CONSTRAINT vivr_versions_pkey PRIMARY KEY (id);


--
-- Name: vivrs vivrs_pkey; Type: CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivrs
    ADD CONSTRAINT vivrs_pkey PRIMARY KEY (id);


--
-- Name: actors_organization_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX actors_organization_idx ON public.actors USING btree (organization_id);


--
-- Name: actors_user_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX actors_user_idx ON public.actors USING btree (user_id);


--
-- Name: actors_user_organization_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX actors_user_organization_unique ON public.actors USING btree (user_id, organization_id);


--
-- Name: import_batches_actor_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX import_batches_actor_idx ON public.inventory_import_batches USING btree (actor_id);


--
-- Name: import_batches_mode_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX import_batches_mode_idx ON public.inventory_import_batches USING btree (mode);


--
-- Name: import_batches_source_hash_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX import_batches_source_hash_idx ON public.inventory_import_batches USING btree (source_hash);


--
-- Name: import_batches_status_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX import_batches_status_idx ON public.inventory_import_batches USING btree (status);


--
-- Name: import_rows_batch_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX import_rows_batch_idx ON public.inventory_import_rows USING btree (batch_id);


--
-- Name: import_rows_batch_line_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX import_rows_batch_line_unique ON public.inventory_import_rows USING btree (batch_id, line_number);


--
-- Name: import_rows_result_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX import_rows_result_idx ON public.inventory_import_rows USING btree (result);


--
-- Name: organizations_slug_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX organizations_slug_unique ON public.organizations USING btree (slug);


--
-- Name: star_numbers_category_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX star_numbers_category_idx ON public.star_numbers USING btree (category);


--
-- Name: star_numbers_category_status_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX star_numbers_category_status_idx ON public.star_numbers USING btree (category, status);


--
-- Name: star_numbers_display_number_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX star_numbers_display_number_unique ON public.star_numbers USING btree (display_number);


--
-- Name: star_numbers_number_code_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX star_numbers_number_code_unique ON public.star_numbers USING btree (number_code);


--
-- Name: star_numbers_source_batch_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX star_numbers_source_batch_idx ON public.star_numbers USING btree (source_batch_id);


--
-- Name: star_numbers_status_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX star_numbers_status_idx ON public.star_numbers USING btree (status);


--
-- Name: vivr_versions_one_draft; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX vivr_versions_one_draft ON public.vivr_versions USING btree (vivr_id) WHERE (published_at IS NULL);


--
-- Name: vivr_versions_published_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX vivr_versions_published_idx ON public.vivr_versions USING btree (published_at);


--
-- Name: vivr_versions_vivr_published_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX vivr_versions_vivr_published_idx ON public.vivr_versions USING btree (vivr_id, published_at);


--
-- Name: vivr_versions_vivr_sequence_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX vivr_versions_vivr_sequence_unique ON public.vivr_versions USING btree (vivr_id, sequence);


--
-- Name: vivrs_organization_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX vivrs_organization_idx ON public.vivrs USING btree (organization_id);


--
-- Name: vivrs_organization_status_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX vivrs_organization_status_idx ON public.vivrs USING btree (organization_id, status);


--
-- Name: vivrs_slug_unique; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE UNIQUE INDEX vivrs_slug_unique ON public.vivrs USING btree (slug);


--
-- Name: vivrs_status_idx; Type: INDEX; Schema: public; Owner: vivr_app
--

CREATE INDEX vivrs_status_idx ON public.vivrs USING btree (status);


--
-- Name: actors actors_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: inventory_import_batches inventory_import_batches_actor_id_actors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.inventory_import_batches
    ADD CONSTRAINT inventory_import_batches_actor_id_actors_id_fk FOREIGN KEY (actor_id) REFERENCES public.actors(id);


--
-- Name: inventory_import_rows inventory_import_rows_batch_id_inventory_import_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.inventory_import_rows
    ADD CONSTRAINT inventory_import_rows_batch_id_inventory_import_batches_id_fk FOREIGN KEY (batch_id) REFERENCES public.inventory_import_batches(id);


--
-- Name: star_numbers star_numbers_source_batch_id_inventory_import_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.star_numbers
    ADD CONSTRAINT star_numbers_source_batch_id_inventory_import_batches_id_fk FOREIGN KEY (source_batch_id) REFERENCES public.inventory_import_batches(id);


--
-- Name: vivr_versions vivr_versions_published_by_id_actors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivr_versions
    ADD CONSTRAINT vivr_versions_published_by_id_actors_id_fk FOREIGN KEY (published_by_id) REFERENCES public.actors(id);


--
-- Name: vivr_versions vivr_versions_vivr_id_vivrs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivr_versions
    ADD CONSTRAINT vivr_versions_vivr_id_vivrs_id_fk FOREIGN KEY (vivr_id) REFERENCES public.vivrs(id);


--
-- Name: vivrs vivrs_current_draft_version_id_vivr_versions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivrs
    ADD CONSTRAINT vivrs_current_draft_version_id_vivr_versions_id_fk FOREIGN KEY (current_draft_version_id) REFERENCES public.vivr_versions(id);


--
-- Name: vivrs vivrs_current_published_version_id_vivr_versions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivrs
    ADD CONSTRAINT vivrs_current_published_version_id_vivr_versions_id_fk FOREIGN KEY (current_published_version_id) REFERENCES public.vivr_versions(id);


--
-- Name: vivrs vivrs_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: vivr_app
--

ALTER TABLE ONLY public.vivrs
    ADD CONSTRAINT vivrs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 0vXyr6OXf9NHJpOnzCA2ucPTBcsaEahRmLwscguhtiS4wWkrM0xcnzqjkMxnYDD

