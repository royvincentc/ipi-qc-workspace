FROM node:22-alpine

# Install Python and LibreOffice (for PDF rendering)
RUN apk add --no-cache python3 py3-lxml libreoffice font-noto

WORKDIR /app

# Set build environment variables
ENV PYTHON_PATH=python3
ENV PDF_RENDERER=libreoffice
ENV SOFFICE_PATH=soffice

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Install Python dependencies (docx, lxml)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install python-docx lxml

# Build the frontend
RUN npm run build

# NOW set to production mode
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
