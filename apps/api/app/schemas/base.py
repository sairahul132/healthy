from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Every request/response schema is camelCase on the wire — matches
    apps/web's lib/api/types.ts exactly, since there's no transform layer
    on either side."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
