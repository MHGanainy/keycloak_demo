FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set environment variable to prevent browser opening
ENV BROWSER=none
# Add host binding (important for containerized environments)
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]