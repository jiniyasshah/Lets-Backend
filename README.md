# Let's Backend

Welcome to Let's Backend, where we delve into learning industry-level backend development!

## Connect with Me

- [Github](https://github.com/jiniyasshah)
- [Facebook](https://www.facebook.com/sanket.shah.ts/)
- [LinkedIn](https://www.linkedin.com/in/jiniyas-shah-20267225b/)

## Contents

1. **Server Initialization and Database Connection**

   - Import and configure environment variables using dotenv
   - Establish a connection to the database with error handling
   - Start the Express server on a specified port with error handling
   - Log server startup and error messages

2. **Implement connectDB Function for MongoDB Connection Setup**

   - Create an asynchronous function to establish a connection to the MongoDB database
   - Utilize mongoose.connect to connect to the specified MongoDB URI with the database name
   - Log successful connection with host information
   - Handle connection errors and exit process with error message if connection fails

3. **Middleware Setup**

   - Configure CORS to allow requests from specified origin and support credentials
   - Add JSON body parser with a size limit of 16kb
   - Add URL-encoded body parser with a size limit of 16kb
   - Use cookie parser middleware
   - Serve static files from the 'public' directory

4. **AsyncHandler Middleware**

   - Create a higher-order function to catch errors in asynchronous request handlers
   - Pass caught errors to the next middleware for centralized error handling

5. **ApiError Class for Standardized Error Handling**

   - Extend the Error class to create custom API errors
   - Include properties for statusCode, message, success, and errors
   - Capture stack trace for better debugging
   - Provide default values for message, errors, and stack

6. **ApiResponse Class for Standardized Response Formatting**

   - Create a class to structure API responses with statusCode, data, and message
   - Determine success based on statusCode to streamline response handling

7. **User Schema Setup and Authentication**

   - Define a mongoose schema for user data with fields like userName, email, fullName, avatar, etc.
   - Implement pre-save middleware to hash passwords before saving to the database
   - Define method for checking password correctness using bcrypt
   - Define methods for generating access and refresh tokens using jwt
   - Provide configuration for token expiration using environment variables
   - Create User model using mongoose.model

8. **Video Schema Setup for Data Modeling and Pagination**
   - Define a mongoose schema for video data with fields like videoFile, thumbnail, title, etc.
   - Include timestamps for tracking creation and update times
   - Implement mongoose-aggregate-paginate-v2 plugin for pagination support
   - Create Video model using mongoose.model
