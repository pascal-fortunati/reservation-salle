CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    password VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP
);

CREATE TABLE reservation (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    date DATE,
    start_time TIME,
    end_time TIME,
    object VARCHAR(255),
    created_at TIMESTAMP,
    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);