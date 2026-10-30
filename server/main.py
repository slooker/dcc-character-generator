"""FastAPI app: the /api routes plus the static builder in dist/.

Static serving matches the previous nginx setup: every response is
`Cache-Control: no-store` while the builder is under active development,
missing .js/.css/.pdf files are 404s, and any other unknown path returns
index.html.

Run locally: DATABASE_URL=sqlite:///./tmp/app.db uvicorn server.main:app --reload
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from server.database import get_session, upgrade

DIST = Path(os.environ.get('DIST_DIR', Path(__file__).resolve().parent.parent / 'dist')).resolve()
ASSET_SUFFIXES = {'.js', '.css', '.pdf'}
MEDIA_TYPES = {'.js': 'text/javascript', '.css': 'text/css', '.pdf': 'application/pdf', '.html': 'text/html'}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.environ.get('RUN_MIGRATIONS', '1') == '1':
        upgrade()
    yield


app = FastAPI(title='Crawler Intake', lifespan=lifespan, docs_url='/api/docs', openapi_url='/api/openapi.json', redoc_url=None)


@app.middleware('http')
async def no_store(request: Request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/api/health')
def health(session: Session = Depends(get_session)):
    session.execute(text('SELECT 1'))
    return {'status': 'ok'}


@app.api_route('/api/{path:path}', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
def api_not_found(path: str):
    raise HTTPException(status_code=404, detail='Not found')


@app.get('/{path:path}')
def static_files(path: str):
    target = (DIST / path).resolve()
    if target.is_relative_to(DIST):
        if target.is_dir():
            target = target / 'index.html'
        if target.is_file():
            return FileResponse(target, media_type=MEDIA_TYPES.get(target.suffix))
    if Path(path).suffix in ASSET_SUFFIXES:
        raise HTTPException(status_code=404, detail='Not found')
    return FileResponse(DIST / 'index.html', media_type='text/html')
