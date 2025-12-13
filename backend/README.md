# MediLab Pro Django Backend

This directory contains the Django + Django REST Framework backend for the MediLab Pro application.

## Prerequisites

- Python (v3.9 or newer recommended)
- pip

## Setup & Running

1.  **Navigate to this directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment (Recommended):**
    ```bash
    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up your API Key:**
    -   Create a file named `.env` in this `backend` directory.
    -   Add the following line to the `.env` file, replacing the placeholder with your actual Google Gemini API key:
        ```
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
        ```

5.  **Set up the database:**
    -   Run the following commands to create the database schema:
    ```bash
    python manage.py migrate
    ```

6.  **Seed the database with initial data:**
    ```bash
    python manage.py seed_data
    ```

7.  **Run the development server:**
    ```bash
    python manage.py runserver
    ```

The server will start on `http://localhost:8000`. The frontend application is configured to communicate with this address.
