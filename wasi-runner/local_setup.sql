DROP TABLE IF EXISTS bots;
DROP USER IF EXISTS snippyuser;

CREATE USER snippyuser WITH PASSWORD 'snippy123';

CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    run_type INT NOT NULL,
    script_contents TEXT,
    wasm_path VARCHAR(255),
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
GRANT ALL PRIVILEGES ON TABLE bots TO snippyuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public to snippyuser;

INSERT INTO bots (name, run_type, script_contents, wasm_path, is_builtin) VALUES ('Rando Bot', 2, E'import random\nnum = random.randint(0, 2)\nprint([''rock'', ''paper'', ''scissors''][num])', '', true);
INSERT INTO bots (name, run_type, script_contents, wasm_path, is_builtin) VALUES ('Randito', 2, E'import random\nnum = random.randint(0, 2)\nprint([''rock'', ''paper'', ''scissors''][num])', '', true);
INSERT INTO bots (name, run_type, script_contents, wasm_path, is_builtin) VALUES ('Rocky', 2, 'print(''rock'')', '', true);
INSERT INTO bots (name, run_type, script_contents, wasm_path, is_builtin) VALUES ('Bookworm', 2, 'print(''paper'')', '', true);
INSERT INTO bots (name, run_type, script_contents, wasm_path, is_builtin) VALUES ('Snippy snap', 2, 'print(''scissors'')', '', true);

-- Add colum to bots table for disabling bots
ALTER TABLE bots ADD is_disabled BOOLEAN NOT NULL DEFAULT FALSE;