DROP TABLE IF EXISTS bots;
DROP USER IF EXISTS snippyuser;

CREATE USER snippyuser WITH PASSWORD 'snippy123';

CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    run_type INT NOT NULL,
    script_contents TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
GRANT ALL PRIVILEGES ON TABLE bots TO snippyuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public to snippyuser;

INSERT INTO bots (name, run_type, script_contents) VALUES ('Rando Bot', 2, E'import random\nnum = random.randint(0, 2)\nprint([''rock'', ''paper'', ''scissors''][num])');
INSERT INTO bots (name, run_type, script_contents) VALUES ('Randito', 2, E'import random\nnum = random.randint(0, 2)\nprint([''rock'', ''paper'', ''scissors''][num])');
INSERT INTO bots (name, run_type, script_contents) VALUES ('Rocky', 2, 'print(''rock'')');
INSERT INTO bots (name, run_type, script_contents) VALUES ('Bookworm', 2, 'print(''paper'')');
INSERT INTO bots (name, run_type, script_contents) VALUES ('Snippy snap', 2, 'print(''scissors'')');
