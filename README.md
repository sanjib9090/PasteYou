# PasteYou

**PasteYou** is a secure and versatile paste management application built with Node.js and SQLite. Users can create, share, and manage text snippets (pastes) with advanced features such as expiration times, password protection, and file uploads.

## Features

- **User Registration and Login:** Secure user authentication using bcrypt for password hashing.
- **Create Pastes:** Create pastes with optional titles, expiration times, visibility settings (public, unlisted, private), and file attachments.
- **Password Protection:** Optionally protect pastes with passwords.
- **URL Shortening:** Generate short URLs for easy sharing.
- **Dashboard:** Manage your pastes in a personalized dashboard.
- **Update and Delete Pastes:** Update or delete your pastes as needed.
- **Search Functionality:** Search for public pastes by title or content.
- **File Uploads:** Attach files to your pastes with secure storage.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [SQLite3](https://www.sqlite.org/index.html)

### Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/sanjib9090/pasteyou.git
    cd pasteyou
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Create necessary directories:**

    Ensure that an `uploads` directory exists for file storage:

    ```bash
    mkdir uploads
    ```

4. **Set up environment variables:**

    Create a `.env` file in the root directory:

    ```env
    SESSION_SECRET=your-session-secret
    PORT=3000
    NODE_ENV=development
    ```

5. **Initialize the database:**

    The application will automatically create the required tables in an SQLite database (`database.db`) when you start the server.

6. **Start the server:**

    ```bash
    npm start
    ```

    The server will run at `http://localhost:3000`.

## Usage

### Register and Login

1. **Register:** Create an account by navigating to `/register`.
2. **Login:** Access your account by navigating to `/login`.

### Creating a Paste

1. After logging in, navigate to the home page.
2. Fill in the form with your content, title (optional), expiration time, and other options.
3. Submit to generate your paste with a unique short URL.

### Managing Your Pastes

1. Navigate to your dashboard (`/dashboard`) to view, update, or delete your pastes.

### Searching for Public Pastes

1. Use the search bar on the home page to find public pastes by title or content.

## Project Structure

- `app.js`: Main server file.
- `views/`: EJS templates for rendering pages.
- `public/`: Static files like CSS, images, etc.
- `uploads/`: Directory for storing uploaded files.
- `database.db`: SQLite database file.

## Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

**PasteYou** - A secure, user-friendly, and feature-rich paste management system.
