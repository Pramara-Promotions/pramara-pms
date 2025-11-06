# Group 3 Infrastructure - Testing & Validation Checklist

**Date**: November 3, 2025  
**Branch**: phase2-complete  
**Tester**: [Name]

---

## 🏭 Feature 1: Factory Hierarchy Management

### Backend API Tests (via Postman/curl/browser)

#### Factories
- [ ] **GET /api/factories** - List all factories
  - [ ] Returns array of factories with counts
  - [ ] Filter by `?active=true` works
  - [ ] Includes floorCount, sectionCount, roomCount, stationCount
  
- [ ] **GET /api/factories/:id** - Get single factory
  - [ ] Returns full hierarchy (floors → sections → rooms)
  - [ ] Shows accurate counts
  - [ ] Returns 404 for non-existent ID
  
- [ ] **POST /api/factories** - Create factory
  - [ ] Creates with name, code, location, address, contact info
  - [ ] Returns created factory with ID
  - [ ] Validates required fields (name)
  - [ ] Requires FACILITY_MANAGE permission
  
- [ ] **PUT /api/factories/:id** - Update factory
  - [ ] Updates all editable fields
  - [ ] Returns updated factory
  - [ ] Requires FACILITY_MANAGE permission
  
- [ ] **DELETE /api/factories/:id** - Soft delete factory
  - [ ] Sets active=false (soft delete)
  - [ ] Returns success message
  - [ ] Requires FACILITY_MANAGE permission
  
- [ ] **GET /api/factories/:id/analytics** - Get factory analytics
  - [ ] Returns totalFloors, totalSections, totalRooms, totalStations
  - [ ] Shows active vs inactive counts

#### Floors
- [ ] **GET /api/factories/:factoryId/floors** - List floors
  - [ ] Returns floors for factory
  - [ ] Includes section and room counts
  
- [ ] **POST /api/factories/:factoryId/floors** - Create floor
  - [ ] Creates floor with name, floorNumber
  - [ ] Links to factory
  - [ ] Requires FACILITY_MANAGE permission
  
- [ ] **PUT /api/floors/:id** - Update floor
  - [ ] Updates name, floorNumber
  - [ ] Returns updated floor
  
- [ ] **DELETE /api/floors/:id** - Soft delete floor
  - [ ] Sets active=false
  - [ ] Returns success message

#### Sections
- [ ] **GET /api/floors/:floorId/sections** - List sections
  - [ ] Returns sections for floor
  - [ ] Includes room count
  
- [ ] **POST /api/floors/:floorId/sections** - Create section
  - [ ] Creates section with name, description
  - [ ] Links to floor
  - [ ] Requires FACILITY_MANAGE permission
  
- [ ] **PUT /api/sections/:id** - Update section
  - [ ] Updates name, description
  - [ ] Returns updated section
  
- [ ] **DELETE /api/sections/:id** - Soft delete section
  - [ ] Sets active=false
  - [ ] Returns success message

#### Rooms
- [ ] **GET /api/sections/:sectionId/rooms** - List rooms
  - [ ] Returns rooms for section
  - [ ] Includes station count
  
- [ ] **GET /api/rooms** - List all rooms with filters
  - [ ] Filter by ?sectionId= works
  - [ ] Filter by ?floorId= works
  - [ ] Filter by ?factoryId= works
  
- [ ] **POST /api/sections/:sectionId/rooms** - Create room
  - [ ] Creates room with name, roomNumber, description
  - [ ] Links to section
  - [ ] Requires FACILITY_MANAGE permission
  
- [ ] **PUT /api/rooms/:id** - Update room
  - [ ] Updates name, roomNumber, description
  - [ ] Returns updated room
  
- [ ] **DELETE /api/rooms/:id** - Soft delete room
  - [ ] Sets active=false
  - [ ] Returns success message

### Frontend Tests (Manual UI Testing)

#### Facility Management Page (/admin → Facilities tab)
- [ ] **Navigation**
  - [ ] Access via Admin panel → Facilities tab
  - [ ] Page loads without errors
  - [ ] Three-panel layout displays correctly
  
- [ ] **Factory List (Left Panel)**
  - [ ] Shows all factories with counts
  - [ ] Click factory selects it
  - [ ] "New Factory" button opens create form
  - [ ] Selected factory highlights
  
- [ ] **Tree View (Middle Panel)**
  - [ ] Shows factory → floors → sections → rooms hierarchy
  - [ ] Expand/collapse icons work
  - [ ] Counts display correctly (e.g., "3 floors, 8 sections")
  - [ ] "Add Floor/Section/Room" buttons appear at correct levels
  - [ ] Edit/Delete buttons work for each entity
  
- [ ] **Details/Form Panel (Right Panel)**
  - [ ] Shows "Select a factory" message when nothing selected
  - [ ] Displays factory details when factory selected
  - [ ] Shows floor/section/room details when selected
  - [ ] Form opens for create/edit operations
  
- [ ] **Factory CRUD**
  - [ ] Create: Fill form → Save → Appears in list
  - [ ] Edit: Click edit → Modify → Save → Updates display
  - [ ] Delete: Click delete → Confirm → Removed from list
  - [ ] Form validation: Required fields enforced
  
- [ ] **Floor CRUD**
  - [ ] Create: Select factory → Add Floor → Fill form → Save
  - [ ] Floor appears in tree under factory
  - [ ] Edit/Delete work correctly
  - [ ] Floor number validation works
  
- [ ] **Section CRUD**
  - [ ] Create: Expand floor → Add Section → Fill form → Save
  - [ ] Section appears in tree under floor
  - [ ] Edit/Delete work correctly
  
- [ ] **Room CRUD**
  - [ ] Create: Expand section → Add Room → Fill form → Save
  - [ ] Room appears in tree under section
  - [ ] Edit/Delete work correctly
  - [ ] Room number field works
  
- [ ] **UI/UX**
  - [ ] Dark mode styling consistent
  - [ ] Icons render correctly (Building2, Layers, Grid3x3, DoorOpen)
  - [ ] Loading states show during API calls
  - [ ] Success/error messages display
  - [ ] Modal closes after successful save
  - [ ] Tree expands/collapses smoothly

---

## 🏢 Feature 2: Station Management with Hierarchy

### Backend Tests

#### Station API Updates
- [ ] **GET /api/stations** - List stations
  - [ ] Returns stations with full Room hierarchy
  - [ ] Room includes section → floor → factory chain
  - [ ] Filter by ?factoryId= works (if implemented)
  
- [ ] **GET /api/stations/:id** - Get single station
  - [ ] Returns station with full hierarchy
  - [ ] Room.section.floor.factory structure correct
  
- [ ] **POST /api/stations** - Create station with room
  - [ ] Accepts roomId in payload
  - [ ] Links station to room
  - [ ] Returns created station with hierarchy
  
- [ ] **PUT /api/stations/:id** - Update station room
  - [ ] Updates roomId
  - [ ] Returns updated station with new hierarchy

### Frontend Tests

#### Stations Page (/execution/stations)
- [ ] **Page Load**
  - [ ] Lists all stations correctly
  - [ ] No compilation errors
  
- [ ] **Filters**
  - [ ] Factory filter dropdown appears
  - [ ] Populated with factories
  - [ ] Filtering by factory works
  - [ ] Project filter still works
  - [ ] Status filter still works
  
- [ ] **Station Cards**
  - [ ] Location breadcrumb displays for stations with rooms
  - [ ] Shows: Factory → Floor → Section → Room
  - [ ] Icons render correctly (Building2, Layers, Grid3x3, DoorOpen)
  - [ ] Breadcrumb formatted nicely with chevrons
  - [ ] Cards without rooms show no breadcrumb (no errors)
  
- [ ] **Create Station Modal**
  - [ ] "New Station" button opens modal
  - [ ] Factory hierarchy section visible (blue background)
  - [ ] All 4 dropdowns present (Factory/Floor/Section/Room)
  
- [ ] **Cascading Dropdowns**
  - [ ] Factory dropdown: Populated on load
  - [ ] Floor dropdown: Disabled until factory selected
  - [ ] Section dropdown: Disabled until floor selected
  - [ ] Room dropdown: Disabled until section selected
  - [ ] Selecting factory loads floors automatically
  - [ ] Selecting floor loads sections automatically
  - [ ] Selecting section loads rooms automatically
  - [ ] Changing parent resets children selections
  
- [ ] **Create with Location**
  - [ ] Select all hierarchy levels
  - [ ] Fill station details
  - [ ] Save creates station
  - [ ] Station card shows location breadcrumb
  
- [ ] **Create without Location**
  - [ ] Leave hierarchy dropdowns empty
  - [ ] Fill station details
  - [ ] Save creates station
  - [ ] Station works normally (no errors)
  
- [ ] **Edit Station Modal**
  - [ ] Edit existing station with room
  - [ ] Hierarchy dropdowns pre-populated correctly
  - [ ] Factory pre-selected
  - [ ] Floor pre-selected and loaded
  - [ ] Section pre-selected and loaded
  - [ ] Room pre-selected
  - [ ] Can change location
  - [ ] Save updates correctly
  
- [ ] **Edit Station without Room**
  - [ ] Edit station without location
  - [ ] Hierarchy dropdowns empty/disabled
  - [ ] Can add location
  - [ ] Save works correctly

---

## 🔔 Feature 3: Tasks & Reminders System

### Backend Tests

#### Reminder API
- [ ] **GET /api/reminders** - List reminders
  - [ ] Returns reminders array
  - [ ] Filter by ?scope=my works (assigned to me)
  - [ ] Filter by ?scope=created works (created by me)
  - [ ] Filter by ?scope=all works (both)
  - [ ] Filter by ?status=pending works
  - [ ] Filter by ?status=completed works
  - [ ] Excludes dismissed by default unless filtered
  - [ ] Includes Task, assignedTo, createdBy relations
  
- [ ] **GET /api/reminders/:id** - Get single reminder
  - [ ] Returns reminder with full relations
  - [ ] Access control: only assignee or creator can view
  - [ ] Returns 403 for unauthorized users
  - [ ] Returns 404 for non-existent ID
  
- [ ] **POST /api/reminders** - Create reminder
  - [ ] Creates with title, dueAt (required)
  - [ ] Accepts optional: description, assignedToId, taskId
  - [ ] Defaults assignedTo to creator if not specified
  - [ ] Returns created reminder
  - [ ] WebSocket notification sent (if assignee differs from creator)
  
- [ ] **PUT /api/reminders/:id** - Update reminder
  - [ ] Only creator can update
  - [ ] Updates title, description, dueAt, assignedToId
  - [ ] Returns 403 for non-creator
  - [ ] Returns updated reminder
  
- [ ] **DELETE /api/reminders/:id** - Delete reminder
  - [ ] Only creator can delete
  - [ ] Returns 403 for non-creator
  - [ ] Removes reminder from database
  
- [ ] **POST /api/reminders/:id/snooze** - Snooze reminder
  - [ ] Only assignee can snooze
  - [ ] Requires snoozeUntil timestamp
  - [ ] Sets status to 'snoozed'
  - [ ] Returns 403 for non-assignee
  
- [ ] **POST /api/reminders/:id/complete** - Complete reminder
  - [ ] Only assignee can complete
  - [ ] Sets status to 'completed'
  - [ ] Records completedAt timestamp
  - [ ] Returns 403 for non-assignee
  
- [ ] **POST /api/reminders/:id/dismiss** - Dismiss reminder
  - [ ] Only assignee can dismiss
  - [ ] Sets status to 'dismissed'
  - [ ] Returns 403 for non-assignee

### Frontend Tests

#### Tasks & Reminders Hub (/reminders)
- [ ] **Navigation**
  - [ ] Access via /reminders URL
  - [ ] Page loads without errors
  - [ ] Header displays correctly
  
- [ ] **Tabs**
  - [ ] "My Reminders" tab works (assigned to me)
  - [ ] "Created by Me" tab works
  - [ ] "All" tab works (both assigned and created)
  - [ ] Tab switching fetches correct data
  
- [ ] **Filters**
  - [ ] "All" filter shows all non-dismissed
  - [ ] "Overdue" filter shows past due + pending
  - [ ] "Today" filter shows due today + pending
  - [ ] "Upcoming" filter shows future due + pending
  - [ ] "Completed" filter shows completed status
  - [ ] Filters work with tab scope
  
- [ ] **View Types**
  - [ ] List view displays by default
  - [ ] List/Calendar toggle buttons work
  - [ ] Calendar view shows placeholder message
  
- [ ] **Reminder Cards**
  - [ ] Display title, description prominently
  - [ ] Show due time with smart formatting
    - [ ] "X days ago" for overdue
    - [ ] "in X hours" for today
    - [ ] "in X days" for upcoming
    - [ ] Full date for distant
  - [ ] Status badges color-coded correctly
    - [ ] Red "Overdue" with icon
    - [ ] Orange "Due Today"
    - [ ] Blue "Upcoming"
    - [ ] Green "Completed"
    - [ ] Yellow "Snoozed"
    - [ ] Gray "Dismissed"
  - [ ] Icons display: Clock, User, Zap (task link)
  - [ ] Assignee name/email shows
  - [ ] Linked task name shows (if present)
  
- [ ] **Action Buttons (Pending Reminders)**
  - [ ] ✅ Complete button (green)
    - [ ] Marks reminder as completed
    - [ ] Updates immediately in UI
  - [ ] ⏰ Snooze button (yellow)
    - [ ] Prompts for hours
    - [ ] Updates snoozeUntil
    - [ ] Changes status to snoozed
  - [ ] ✕ Dismiss button (gray)
    - [ ] Dismisses reminder
    - [ ] Removes from default view
  - [ ] ✏️ Edit button (blue)
    - [ ] Opens edit modal
    - [ ] Pre-fills form with current data
  - [ ] 🗑️ Delete button (red)
    - [ ] Shows confirmation prompt
    - [ ] Deletes reminder
    - [ ] Removes from list
  
- [ ] **Create Reminder**
  - [ ] "New Reminder" button opens modal
  - [ ] Title field (required)
  - [ ] Description field (optional)
  - [ ] Due Date & Time picker (required)
  - [ ] Form validation enforces required fields
  - [ ] Cancel closes without saving
  - [ ] Create saves and closes modal
  - [ ] New reminder appears in list
  
- [ ] **Edit Reminder**
  - [ ] Edit button opens modal
  - [ ] Form pre-populated with current values
  - [ ] Can modify all fields
  - [ ] Update saves changes
  - [ ] Updated reminder reflects in list
  
- [ ] **Empty States**
  - [ ] "No reminders found" message when empty
  - [ ] "Create your first reminder" link works
  
- [ ] **Loading States**
  - [ ] Shows "Loading reminders..." during fetch
  - [ ] Mutation buttons show loading/disabled state
  
- [ ] **React Query Integration**
  - [ ] List updates immediately after mutations
  - [ ] No manual page refresh needed
  - [ ] Query invalidation works correctly

### WebSocket Tests (if available)
- [ ] **Notification on Reminder Create**
  - [ ] Create reminder assigned to another user
  - [ ] Assigned user receives real-time notification
  - [ ] Notification contains: id, title, dueAt, createdBy

---

## 🔍 Feature 4: Global Search Integration

### Header Search Tests

#### Typing Behavior
- [ ] **Basic Input**
  - [ ] Can type in search box
  - [ ] Input value displays correctly
  - [ ] Typing 1 character: no action
  - [ ] Typing 2+ characters: starts debounce timer
  
- [ ] **Debouncing (500ms)**
  - [ ] After typing, wait 500ms
  - [ ] CommandPalette opens automatically
  - [ ] Query pre-filled in palette
  - [ ] Typing more resets timer
  
- [ ] **Minimum Character Requirement**
  - [ ] Query with 0 chars: no action
  - [ ] Query with 1 char: no action
  - [ ] Query with 2 chars: triggers search
  - [ ] Query with 3+ chars: triggers search

#### Keyboard Navigation
- [ ] **Enter Key**
  - [ ] Type 2+ chars → Press Enter
  - [ ] Opens CommandPalette immediately (no debounce wait)
  - [ ] Query pre-filled
  - [ ] Works as fast path
  
- [ ] **Escape Key**
  - [ ] Press Escape in search box
  - [ ] Clears input value
  - [ ] Does not close CommandPalette if open
  
- [ ] **Cmd/Ctrl+K (Existing)**
  - [ ] Press Cmd+K (Mac) or Ctrl+K (Windows)
  - [ ] Opens CommandPalette
  - [ ] Input empty (backward compatible)
  - [ ] Can type fresh search

#### CommandPalette Integration
- [ ] **Initial Query Prop**
  - [ ] CommandPalette receives initialQuery
  - [ ] Query field auto-populated when opened from search
  - [ ] Query field empty when opened via Cmd+K
  
- [ ] **Auto-Cleanup**
  - [ ] Close CommandPalette (X button)
  - [ ] Search input clears automatically
  - [ ] Ready for next search
  - [ ] Close via Escape also clears

#### Search Flow
- [ ] **Full Flow Test 1: Debounced**
  1. [ ] Type "project" in header search
  2. [ ] Wait 500ms (no Enter press)
  3. [ ] CommandPalette opens
  4. [ ] "project" appears in search field
  5. [ ] Results show (if backend wired)
  6. [ ] Close palette
  7. [ ] Search input clears
  
- [ ] **Full Flow Test 2: Enter Key**
  1. [ ] Type "task" in header search
  2. [ ] Press Enter immediately
  3. [ ] CommandPalette opens instantly
  4. [ ] "task" appears in search field
  5. [ ] Close palette
  6. [ ] Search input clears
  
- [ ] **Full Flow Test 3: Escape Clear**
  1. [ ] Type "qc" in header search
  2. [ ] Press Escape
  3. [ ] Input clears
  4. [ ] CommandPalette doesn't open

---

## 📋 Cross-Feature Integration Tests

### Factory → Station Flow
- [ ] Create factory → floor → section → room hierarchy
- [ ] Create station and assign to room
- [ ] Station card shows correct location breadcrumb
- [ ] Edit station's location to different room
- [ ] Breadcrumb updates correctly

### Search → Navigate Flow
- [ ] Type in header search
- [ ] CommandPalette opens with query
- [ ] Select result (if backend wired)
- [ ] Navigates to correct page

### Reminder → Task Flow (if Task integration exists)
- [ ] Create reminder linked to a task
- [ ] Reminder card shows task name with icon
- [ ] Click on reminder shows task info

---

## 🐛 Known Issues / Limitations

### Documented During Testing

1. **Issue**: [Description]
   - **Severity**: Low / Medium / High / Critical
   - **Steps to Reproduce**: 
   - **Expected**: 
   - **Actual**: 
   - **Workaround**: 

2. **Issue**: Calendar view not implemented for reminders
   - **Severity**: Low (planned future feature)
   - **Expected**: Calendar view of reminders by due date
   - **Actual**: Placeholder message "Calendar view coming soon..."
   - **Workaround**: Use list view with filters

3. **Issue**: WebSocket notifications depend on global.io setup
   - **Severity**: Medium
   - **Expected**: Real-time reminder notifications
   - **Actual**: Only works if WebSocket server configured
   - **Workaround**: Notifications sent, but may not be received if WS not set up

---

## ✅ Sign-Off

### Tested By
- **Name**: ___________________
- **Date**: ___________________
- **Environment**: Dev / Staging / Production
- **Browser**: Chrome / Firefox / Safari / Edge (version: ___)

### Test Results Summary
- **Total Tests**: _____ / _____
- **Passed**: _____
- **Failed**: _____
- **Blocked**: _____
- **Not Applicable**: _____

### Critical Issues Found
1. [Issue description]
2. [Issue description]
3. [Issue description]

### Recommendation
- [ ] ✅ Ready for Production
- [ ] ⚠️ Minor Issues - Can Deploy with Known Limitations
- [ ] ❌ Critical Issues - Do Not Deploy

### Notes
[Add any additional observations, performance issues, UX feedback, etc.]

---

## 📊 Automated Testing (Future)

### API Tests (Jest/Supertest)
```bash
# Run API tests when implemented
cd api
npm test -- routes/factories
npm test -- routes/reminders
```

### Frontend Tests (Playwright/Cypress)
```bash
# Run E2E tests when implemented
cd web
npm run test:e2e -- facility-management
npm run test:e2e -- reminders
```

### Database Migration Verification
```bash
# Verify migrations applied successfully
npx prisma migrate status
npx prisma db pull  # Compare schema
```

---

**End of Test Checklist**
