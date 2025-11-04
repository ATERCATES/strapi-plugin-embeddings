import type { Core } from '@strapi/strapi';
import { extractContentTypeName } from '../services/modules/profiles';

const systemController = ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /embeddings/content-types - Get all content types with their text fields and component fields
  async getContentTypes(ctx: any) {
    try {
      const contentTypes = strapi.contentTypes;
      const components = strapi.components;
      const result: any[] = [];

      // Helper function to extract text fields from component attributes
      const getComponentTextFields = (componentUid: string) => {
        const component = components[componentUid];
        if (!component) return [];
        
        const textFields: any[] = [];
        const attributes = (component as any).attributes || {};

        for (const [fieldName, field] of Object.entries(attributes)) {
          const fieldType = (field as any).type;
          
          if (fieldType === 'text' || fieldType === 'richtext' || fieldType === 'string') {
            textFields.push({
              name: fieldName,
              type: fieldType,
              isComponentField: true,
            });
          }
        }

        return textFields;
      };

      for (const [fullUid, contentType] of Object.entries(contentTypes)) {
        // Only include api:: content types
        if (!String(fullUid).startsWith('api::')) {
          continue;
        }

        const textFields: any[] = [];
        const attributes = (contentType as any).attributes || {};

        for (const [fieldName, field] of Object.entries(attributes)) {
          const fieldType = (field as any).type;
          
          // Include text, richtext, and string fields
          if (fieldType === 'text' || fieldType === 'richtext' || fieldType === 'string') {
            textFields.push({
              name: fieldName,
              type: fieldType,
            });
          } else if (fieldType === 'component') {
            // Handle component fields
            const componentUid = (field as any).component;
            const componentFields = getComponentTextFields(componentUid);
            
            if (componentFields.length > 0) {
              textFields.push({
                name: fieldName,
                type: 'component',
                isComponent: true,
                componentUid,
                children: componentFields.map(childField => ({
                  ...childField,
                  parentName: fieldName,
                  displayName: `${fieldName}.${childField.name}`,
                })),
              });
            }
          }
        }

        // Only include content types that have text fields
        if (textFields.length > 0) {
          const simpleUid = extractContentTypeName(String(fullUid));
          result.push({
            uid: simpleUid,
            displayName: (contentType as any).info?.displayName || simpleUid,
            fields: textFields,
          });
        }
      }

      ctx.body = { data: result };
    } catch (error: any) {
      strapi.log.error('[Embeddings Plugin] Get content types error:', error);
      ctx.throw(500, 'Error fetching content types');
    }
  },
});

export default systemController;
