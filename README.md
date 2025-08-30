Tech Stack

Frontend





React (v18.x)





A JavaScript library for building user interfaces, used for creating reusable components and managing the application's state.



Provides a single-page application (SPA) experience with dynamic rendering.



Bootstrap (v5.3.2)





A CSS framework used for responsive design, styling components, and creating a consistent UI.



Includes pre-built components like modals, tables, and forms for rapid development.



Lucide-React (Latest version)





An icon library providing lightweight, customizable SVG icons used for visual elements like search, edit, and status indicators.



React Context API





Used for state management to share ticket data and functions across components without prop drilling.



JavaScript (ES6+)





Modern JavaScript syntax used for frontend logic, including async/await for API calls and event handling.



HTML5 & CSS3





Standard web technologies for structuring and styling the user interface.

Backend





Node.js (v18.x or higher)





A JavaScript runtime used to run the server-side application.



Express.js (v4.x)





A minimal web framework for Node.js, used to build the RESTful API for ticket management.



PostgreSQL (v14.x or higher)





A relational database management system used to store ticket data, including title, description, priority, status, and timestamps.



pg (Node-Postgres) (v8.x)





A PostgreSQL client for Node.js, used to interact with the database for CRUD operations.



CORS (Latest version)





Middleware to enable Cross-Origin Resource Sharing, allowing the frontend to communicate with the backend API.



express-rate-limit (Latest version)





Middleware to limit repeated requests to public APIs, enhancing security against brute-force attacks.



Helmet (Latest version)





Setup Instructions





Clone the Repository:

git clone <repository-url>
cd ticketing-system



Install Dependencies:


Frontend:

cd client
npm install



Backend:

cd server
npm install

Docker Setup
docker-compose up --build


This will spin up:

Frontend → http://localhost:3000

API → http://localhost:5000