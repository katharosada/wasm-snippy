# Build stage
FROM node:latest AS builder

WORKDIR /app
COPY ./ .

RUN npm install
RUN npm run build

# Nginx stage
FROM nginx:latest

# Set the working directory for Nginx
WORKDIR /app

# Copy the build output from the builder stage to Nginx's default directory
COPY --from=builder /app/dist /usr/share/nginx/html

RUN mkdir /usr/share/nginx/html/snippy
RUN mv /usr/share/nginx/html/assets /usr/share/nginx/html/snippy/assets

# Optionally copy a custom Nginx config (if you have one)
COPY ./nginx.conf /etc/nginx/nginx.conf

# Expose port 80 to access the app
EXPOSE 80

# Nginx will automatically serve the content
CMD ["nginx", "-g", "daemon off;"]
