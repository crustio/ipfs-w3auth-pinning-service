FROM node:14-alpine
WORKDIR /app
COPY dist ./dist
COPY node_modules ./node_modules
EXPOSE 3000
CMD ["node", "./dist/app.js"]
