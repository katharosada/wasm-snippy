DROP TABLE IF EXISTS bots;
CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    run_type INT NOT NULL,
    script_contents TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO bots (name, run_type, script_contents) VALUES ('randobot', 1, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('randito', 1, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('rocky', 2, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('bookworm', 3, '');
INSERT INTO bots (name, run_type, script_contents) VALUES ('snippy', 4, '');
