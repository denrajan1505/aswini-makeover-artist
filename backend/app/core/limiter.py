from slowapi import Limiter
from slowapi.util import get_remote_address

# NOTE: this uses in-memory storage, which is per-process. deploy/aswini-makeover.service
# runs uvicorn with --workers 2, so each worker enforces the limit independently —
# a client's effective ceiling is roughly (limit x worker count), not the limit itself.
# For an exact shared limit, switch to a shared backend, e.g.
# Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379").
limiter = Limiter(key_func=get_remote_address)
