FROM node:10-alpine
WORKDIR /app

# Copy app files into container
COPY . /app

# Install node packages
RUN npm install

CMD npm start
EXPOSE 3000