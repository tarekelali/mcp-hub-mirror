// JSON Schemas for API contract validation

export const CountriesResponseSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["code", "name", "total", "published", "unpublished"],
    properties: {
      code: { type: "string", pattern: "^[A-Z]{2}$" },
      name: { type: "string", minLength: 1 },
      total: { type: "integer", minimum: 0 },
      published: { type: "integer", minimum: 0 },
      unpublished: { type: "integer", minimum: 0 },
      centroid: {
        type: ["object", "null"],
        properties: {
          lat: { type: "number" },
          lng: { type: "number" }
        }
      }
    },
    additionalProperties: false
  }
};

export const ProjectsResponseSchema = {
  type: "object",
  required: ["items", "total_count", "has_more", "offset", "limit", "filters"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["project_id", "name_raw", "ingested_at"],
        properties: {
          project_id: { type: "string", minLength: 1 },
          name_raw: { type: "string", minLength: 1 },
          country_name: { type: ["string", "null"] },
          country_code: { type: ["string", "null"], pattern: "^[A-Z]{2}$|^$" },
          unit_code: { type: ["string", "null"] },
          unit_number: { type: ["integer", "null"] },
          city: { type: ["string", "null"] },
          parse_confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
          ingested_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" }
        },
        additionalProperties: false
      }
    },
    total_count: { type: "integer", minimum: 0 },
    has_more: { type: "boolean" },
    offset: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1, maximum: 200 },
    filters: {
      type: "object",
      properties: {
        country: { type: "string", pattern: "^[A-Z]{2}$" },
        search: { type: "string" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

export const CapabilitiesResponseSchema = {
  type: "object",
  required: ["routes", "auth", "data", "ui", "diag_hidden", "build"],
  properties: {
    routes: {
      type: "object",
      required: ["map", "projects", "cmp", "viewer"],
      properties: {
        map: { type: "boolean" },
        projects: { type: "boolean" },
        cmp: { type: "boolean" },
        viewer: { type: "boolean" }
      },
      additionalProperties: false
    },
    auth: {
      type: "object",
      required: ["three_leg", "two_leg"],
      properties: {
        three_leg: { type: "boolean" },
        two_leg: { type: "boolean" }
      },
      additionalProperties: false
    },
    data: {
      type: "object",
      required: ["countries", "projects", "cmps"],
      properties: {
        countries: { type: "boolean" },
        projects: { type: "boolean" },
        cmps: { type: "boolean" }
      },
      additionalProperties: false
    },
    ui: {
      type: "object",
      required: ["skapa"],
      properties: {
        skapa: { type: "boolean" }
      },
      additionalProperties: false
    },
    diag_hidden: { type: "boolean" },
    build: {
      type: "object",
      required: ["timestamp", "sha", "version"],
      properties: {
        timestamp: { type: "string", format: "date-time" },
        sha: { type: "string" },
        version: { type: "string" }
      },
      additionalProperties: true
    }
  },
  additionalProperties: true
};

export const HealthResponseSchema = {
  type: "object",
  required: ["ok", "latency_ms", "deps"],
  properties: {
    ok: { type: "boolean" },
    latency_ms: { type: "number", minimum: 0 },
    deps: {
      type: "array",
      items: { type: "string" }
    },
    endpoint: { type: "string" },
    error: { type: "string" }
  },
  additionalProperties: false
};

// Simple JSON Schema validator
export function validateSchema(data: unknown, schema: any): { valid: boolean; errors?: string[] } {
  try {
    const errors: string[] = [];
    
    function validate(value: any, schemaObj: any, path = ""): boolean {
      if (schemaObj.type === "array") {
        if (!Array.isArray(value)) {
          errors.push(`${path}: expected array, got ${typeof value}`);
          return false;
        }
        if (schemaObj.items) {
          return value.every((item, index) => validate(item, schemaObj.items, `${path}[${index}]`));
        }
        return true;
      }
      
      if (schemaObj.type === "object") {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          errors.push(`${path}: expected object, got ${typeof value}`);
          return false;
        }
        
        if (schemaObj.required) {
          for (const required of schemaObj.required) {
            if (!(required in value)) {
              errors.push(`${path}: missing required property '${required}'`);
              return false;
            }
          }
        }
        
        if (schemaObj.properties) {
          for (const [key, propSchema] of Object.entries(schemaObj.properties)) {
            if (key in value) {
              if (!validate(value[key], propSchema, `${path}.${key}`)) {
                return false;
              }
            }
          }
        }
        
        return true;
      }
      
      if (Array.isArray(schemaObj.type)) {
        return schemaObj.type.some((type: string) => {
          if (type === "null") return value === null;
          if (type === "string") return typeof value === "string";
          if (type === "number") return typeof value === "number";
          if (type === "integer") return Number.isInteger(value);
          if (type === "boolean") return typeof value === "boolean";
          if (type === "object") {
            if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
            if (schemaObj.properties) {
              for (const [key, propSchema] of Object.entries(schemaObj.properties)) {
                if (key in value) {
                  if (!validate(value[key], propSchema, `${path}.${key}`)) return false;
                }
              }
            }
            return true;
          }
          return false;
        });
      }
      
      if (schemaObj.type === "string") {
        if (typeof value !== "string") {
          errors.push(`${path}: expected string, got ${typeof value}`);
          return false;
        }
        if (schemaObj.pattern && !new RegExp(schemaObj.pattern).test(value)) {
          errors.push(`${path}: string does not match pattern ${schemaObj.pattern}`);
          return false;
        }
        if (schemaObj.minLength && value.length < schemaObj.minLength) {
          errors.push(`${path}: string too short (min: ${schemaObj.minLength})`);
          return false;
        }
        return true;
      }
      
      if (schemaObj.type === "number" || schemaObj.type === "integer") {
        const isValidType = schemaObj.type === "integer" ? Number.isInteger(value) : typeof value === "number";
        if (!isValidType) {
          errors.push(`${path}: expected ${schemaObj.type}, got ${typeof value}`);
          return false;
        }
        if (schemaObj.minimum !== undefined && value < schemaObj.minimum) {
          errors.push(`${path}: value ${value} below minimum ${schemaObj.minimum}`);
          return false;
        }
        if (schemaObj.maximum !== undefined && value > schemaObj.maximum) {
          errors.push(`${path}: value ${value} above maximum ${schemaObj.maximum}`);
          return false;
        }
        return true;
      }
      
      if (schemaObj.type === "boolean") {
        if (typeof value !== "boolean") {
          errors.push(`${path}: expected boolean, got ${typeof value}`);
          return false;
        }
        return true;
      }
      
      return true;
    }
    
    const isValid = validate(data, schema);
    return { valid: isValid, errors: errors.length > 0 ? errors : undefined };
  } catch (error) {
    return { valid: false, errors: [`Validation error: ${error}`] };
  }
}