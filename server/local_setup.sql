DROP TABLE IF EXISTS bots;
DROP USER IF EXISTS snippyuser;

CREATE USER snippyuser WITH PASSWORD 'snippy123';

CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    run_type INT NOT NULL,
    script_contents TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE bots TO snippyuser;

INSERT INTO bots (name, run_type, script_contents) VALUES ('randobot', 1, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('randito', 1, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('rocky', 2, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('bookworm', 3, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('snippy', 4, '');
