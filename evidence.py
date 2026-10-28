"""Optioneel extern bewijskanaal. Geen WhatsApp API, berichten of telefoonnummers inlezen."""
import re
from urllib.parse import urlsplit

MODES = ('app', 'whatsapp', 'both')

def validate(mode, link):
    from games_base import PlayError
    if not isinstance(mode, str) or mode not in MODES:
        raise PlayError('Kies een geldig bewijskanaal.')
    if not isinstance(link, str) or len(link) > 220:
        raise PlayError('Ongeldige WhatsApp-groepslink.')
    link = link.strip()
    if link:
        parts = urlsplit(link)
        if parts.scheme != 'https' or parts.netloc.lower() not in ('chat.whatsapp.com', 'www.chat.whatsapp.com') or not re.fullmatch(r'/[A-Za-z0-9_-]{10,100}/?', parts.path) or parts.query or parts.fragment:
            raise PlayError('Gebruik alleen een geldige https://chat.whatsapp.com/ groepsuitnodiging.')
    if mode in ('whatsapp', 'both') and not link:
        raise PlayError('Plak eerst de WhatsApp-uitnodigingslink voordat je dit kanaal inschakelt.')
    return {'mode': mode, 'link': link}


def view_for(ev, role):
    """0.14.3: de groepslink alleen voor spelleider en aangemelde spelers.
    Het beamerscherm en de publieke API (zonder spelerscode) krijgen alleen het gekozen kanaal,
    anders kan iedereen op de wifi of met de QR-code de WhatsApp-groep in en telefoonnummers zien."""
    ev = ev or {'mode': 'app', 'link': ''}
    return {'mode': ev.get('mode', 'app'), 'link': ev.get('link', '') if role in ('host', 'player', 'team') else ''}
