# Instructions for AI Assistant

## Project Overview
This is **strapi-plugin-embeddings**, a Strapi v5 plugin that provides AI embeddings and semantic search functionality using OpenAI and pgvector (PostgreSQL vector extension).

**Tech Stack:**
- **Backend**: Node.js, TypeScript, Strapi v5
- **Frontend**: React 18, TypeScript, Strapi Design System
- **Database**: PostgreSQL with pgvector extension
- **AI**: OpenAI API for embeddings
- **Build Tools**: Strapi Plugin SDK

---

## Core Development Principles

### 1. Clean Code is Mandatory
- Write clean, readable, and maintainable code at all times
- Follow TypeScript best practices and use proper typing
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Add comments only when necessary to explain complex logic
- Follow the existing code structure and patterns in the project

### 2. NO README Updates for Changes
- **NEVER** create or update README files to explain what you've done
- Do not create CHANGELOG files or similar documentation
- The code should be self-explanatory
- Use Git commit messages if needed, but don't document changes in markdown files

### 3. Testing Approach
- **Always run tests using commands**, never create test files unless explicitly requested
- Use existing test scripts from `package.json`:
  - `npm run test:ts:front` - TypeScript check for admin
  - `npm run test:ts:back` - TypeScript check for server
- Execute commands in the terminal to verify functionality
- Test the actual running application, not just unit tests

---

## Mandatory Workflow for Every Change

### After ANY Feature Addition or Modification:

1. **Open Chrome Browser with MCP**
   - Use the Chrome DevTools MCP to open and interact with the application
   - Navigate to the relevant pages that were modified
   - Test all functionality related to your changes

2. **Verify UI and Appearance**
   - Take screenshots using Chrome MCP (`mcp_chrome-devtoo_take_screenshot`)
   - Verify that the UI looks good and matches the Strapi Design System aesthetics
   - Check responsive behavior if relevant
   - Ensure buttons, forms, and interactive elements work correctly

3. **Functional Testing**
   - Click through the modified features
   - Test all user interactions (forms, buttons, modals, etc.)
   - Verify error handling and edge cases
   - Check that data flows correctly between frontend and backend

4. **Database Verification (When Relevant)**
   - For database-related changes, use the PostgreSQL MCP tools
   - Connect to the database using `pgsql_connect`
   - Verify schema changes with `pgsql_db_context`
   - Run queries to check data integrity with `pgsql_query`
   - Confirm pgvector operations are working correctly

---

## Web Search Usage - ALWAYS PRIORITIZE

### When to Use Web Search (MANDATORY):

1. **Always when you need information or documentation**
   - Search for official documentation before implementing features
   - Look up API references, especially for Strapi v5, OpenAI, pgvector
   - Check for breaking changes or deprecations

2. **When something fails**
   - If a fix attempt doesn't work, use web search immediately
   - Don't try more than 2-3 approaches without searching
   - Look for error messages, stack traces, or similar issues online

3. **For new or unfamiliar technologies**
   - Strapi v5 is relatively new - always search for latest practices
   - OpenAI API updates frequently - verify current methods
   - pgvector and vector operations - check current best practices

4. **Before major implementations**
   - Research patterns and approaches used by the community
   - Look for official examples or tutorials
   - Check for known issues or limitations

5. **For optimization and best practices**
   - Search for performance tips
   - Look for security considerations
   - Find recommended patterns for the specific framework/library

### Web Search Best Practices:
- Use specific search queries with version numbers (e.g., "Strapi v5 plugin development")
- Include error messages in searches when debugging
- Look for official documentation first, then community solutions
- Verify information is current (check dates on articles/docs)

---

## Database-Specific Guidelines

### PostgreSQL with pgvector:
- Always verify the pgvector extension is properly installed
- Use the MCP PostgreSQL tools for complex database operations:
  - `pgsql_list_servers` - List available database servers
  - `pgsql_connect` - Connect to the database
  - `pgsql_db_context` - Get schema information
  - `pgsql_query` - Run SELECT queries for verification
  - `pgsql_modify` - Execute DDL/DML statements
  - `pgsql_visualize_schema` - Visualize database schema

### Tables in this Plugin:
- `plugin_embedding_profiles` - Profile configurations
- `plugin_embedding_profile_fields` - Field mappings for profiles
- `plugin_embedding_vectors` - Vector embeddings storage
- `plugin_embedding_jobs` - Background job tracking
- `plugin_embedding_logs` - Operation logs

---

## Project Structure Understanding

```
admin/src/          → Frontend React components and pages
  components/       → Reusable UI components (modals, sections, etc.)
  pages/           → Main pages (HomePage, JobsPage, LogsPage)
  
server/src/         → Backend Strapi plugin logic
  bootstrap.ts     → Database setup and initialization
  services/        → Business logic and API integrations
  controllers/     → Request handlers
  routes/          → API route definitions
  config/          → Plugin configuration schema
```

---

## Common Tasks and Patterns

### Adding a New Feature:
1. Determine if it's frontend, backend, or both
2. **Search for Strapi v5 examples** of similar features
3. Implement following existing patterns in the codebase
4. Test TypeScript compilation
5. **Open Chrome MCP and test the feature**
6. **Take screenshots to verify UI**
7. Verify database changes if applicable

### Fixing Bugs:
1. Reproduce the issue
2. **If unclear, use web search** to understand the error
3. Check relevant files (services, controllers, components)
4. Implement fix following clean code principles
5. Test with commands
6. **Verify fix in Chrome browser**

### Database Changes:
1. **Always fetch schema context first** using `pgsql_db_context`
2. Make changes through Knex.js migrations in `bootstrap.ts`
3. **Use PostgreSQL MCP** to verify changes
4. Test with actual queries
5. Ensure pgvector operations work correctly

---

## Key Plugin Features to Understand

1. **Profiles**: Configurations for which content types and fields to embed
2. **Vectors**: Stored embeddings generated from content
3. **Jobs**: Background tasks for generating embeddings
4. **Logs**: Activity tracking for debugging and monitoring
5. **Semantic Search**: Vector similarity search using pgvector

---

## Quality Checklist Before Completing Any Task

- [ ] Code compiles without TypeScript errors
- [ ] Code follows existing patterns and structure
- [ ] No unnecessary comments or documentation files created
- [ ] Feature tested via terminal commands
- [ ] **Chrome browser opened and feature tested visually**
- [ ] **Screenshots taken to verify UI appearance**
- [ ] Database changes verified (if applicable) via PostgreSQL MCP
- [ ] Web search performed for any uncertainties
- [ ] No breaking changes introduced

---

## Important Reminders

- **Clean code > Quick code**
- **Test in browser, not just in theory**
- **Verify UI appearance always**
- **Search when in doubt**
- **Use MCPs for testing, not just for writing code**
- **No documentation of your changes in markdown files**

---

## Emergency Protocol

If you're stuck after 2-3 attempts:
1. **STOP** and use web search
2. Look for official documentation
3. Search for the specific error message
4. Check GitHub issues for similar problems
5. Verify you're using the correct API version
6. Ask for clarification if the requirement is unclear

Remember: It's better to search and find the right solution than to keep trying wrong approaches.

## Environment Setup

1. Strapi is already running on localhost:1337/admin
2. Plugin is already running and connected to Strapi

### Credentials for Strapi Admin
- devteam@dribo.es:
- BxyQpe8P