# Groepsspel online spelserver. Alleen de Python-standaardbibliotheek; geen extra pakketten.
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080 GROEPSSPEL_MAX_ROOMS=200
WORKDIR /app
COPY *.py *.json ./
COPY web ./web
COPY pwa ./pwa
RUN useradd --create-home --uid 10001 spel && mkdir -p /data && chown spel /data
USER spel
VOLUME ["/data"]
EXPOSE 8080
# GROEPSSPEL_PUBLIC_URL moet het https-adres zijn waarop spelers de server openen.
CMD ["sh", "-c", "python server.py --online --bind 0.0.0.0 --port ${PORT} --data /data --trust-proxy"]
