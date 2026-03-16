#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: Build a production-ready React Native/Expo document scanning and estimating app with camera/gallery capture, corner selection for perspective correction, line items management, tax calculations, PDF export, and sharing via system share sheet. No backend, no auth, no demo data.

frontend:
  - task: "Home Screen - Estimates/Invoices List"
    implemented: true
    working: true
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Home screen with empty state, Create New modal, settings modal, estimate cards display. Verified via screenshots."

  - task: "Create New Estimate/Invoice"
    implemented: true
    working: true
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Create New modal shows Estimate and Invoice options. Creates documents with auto-incrementing numbers (EST-0001, INV-0001)."

  - task: "Estimate Detail Screen"
    implemented: true
    working: true
    file: "/app/frontend/app/estimate/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Full editor with customer info, document capture, line items, totals, notes, and export button. Verified via screenshots."

  - task: "Camera/Gallery Image Picker"
    implemented: true
    working: true
    file: "/app/frontend/app/estimate/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "expo-image-picker with camera and gallery options. Images stored as base64. Take Photo and Gallery buttons visible."

  - task: "Corner Selector for Perspective Correction"
    implemented: true
    working: true
    file: "/app/frontend/src/components/CornerSelector.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Draggable 4-corner UI for selecting document edges. Crops to bounding box using expo-image-manipulator."

  - task: "Line Item Form and Management"
    implemented: true
    working: true
    file: "/app/frontend/src/components/LineItemForm.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Form with description, quantity, unit price, measurement, notes. Add/edit/delete items. Verified via screenshots showing Roofing item with $1149.75 total."

  - task: "Tax and Total Calculations"
    implemented: true
    working: true
    file: "/app/frontend/src/utils/calculations.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Subtotal, tax calculation (configurable %), grand total. Shows correctly: 25 x $45.99 = $1149.75."

  - task: "PDF Generation and Export"
    implemented: true
    working: true
    file: "/app/frontend/src/utils/pdfGenerator.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Professional PDF template with HTML/CSS. Uses expo-print. Includes business info, customer, line items, totals, document image."

  - task: "Share/Print Functionality"
    implemented: true
    working: true
    file: "/app/frontend/app/estimate/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Export/Share button opens modal with Share PDF and Print options. Uses expo-sharing and expo-print."

  - task: "Customer Information Modal"
    implemented: true
    working: true
    file: "/app/frontend/app/estimate/[id].tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Add/Edit customer with name, email, phone, address fields. Saves to estimate."

  - task: "Settings Modal - Business Info & Tax Rate"
    implemented: true
    working: true
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Settings modal with business name, email, phone, address, and tax rate percentage."

  - task: "AsyncStorage Persistence"
    implemented: true
    working: true
    file: "/app/frontend/src/store/storage.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Storage utilities for estimates and settings. Note: Web preview may not persist data between page reloads; works best on actual mobile device."

  - task: "Status Management"
    implemented: true
    working: true
    file: "/app/frontend/app/estimate/[id].tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Estimate status dropdown with Draft, Sent, Accepted, Paid options. Color-coded badges."

  - task: "PixelMeasure - Auto Measure Button in LineItemForm"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/LineItemForm.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Auto Measure button exists in LineItemForm and navigates to /auto-measure route. useEffect watches measurements context and auto-fills measurement field within 30 seconds of measurement."

  - task: "PixelMeasure - Auto Measure Camera Screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/auto-measure.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Full camera measurement screen with tap-to-mark points, pixel distance calculation, calibration modal, and result modal. Adds measurements to MeasureContext. On Save & Use, calls router.back() to return to estimate."

  - task: "PixelMeasure - Measure Settings Screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/measure-settings.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Settings screen for unit system (metric/imperial), calibration profiles management, and camera overlay options (grid/guides). Accessible from Auto Measure screen settings icon."

  - task: "PixelMeasure - Measurement History Screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/measure-history.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "History screen showing all saved measurements with sort by date or distance, export as CSV, and delete options."

  - task: "PixelMeasure - MeasureContext State Management"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/contexts/MeasureContext.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Full context with calibration profiles, measurements, unit system, grid/guides settings. Persists to AsyncStorage. MeasureProvider wraps app in _layout.tsx."

metadata:
  created_by: "main_agent"
  version: "3.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "PixelMeasure - Auto Measure Button in LineItemForm"
    - "PixelMeasure - Auto Measure Camera Screen"
    - "PixelMeasure - Measure Settings Screen"
    - "PixelMeasure - Measurement History Screen"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "PixelMeasure integration is complete with all infrastructure in place. Tasks needing test: 1) Auto Measure button visible in LineItemForm (inside estimate line items modal), 2) Navigating to /auto-measure route works, 3) Camera permission screen shows on web (no actual camera available), 4) Measure settings (/measure-settings) shows unit system and calibration UI, 5) Measure history (/measure-history) shows empty state. The complete flow: user opens line item form -> taps Auto Measure -> goes to camera screen -> marks two points -> measures -> saves to context -> taps Use This Value -> returns to form -> measurement auto-fills. NOTE: On web preview camera won't work but UI/navigation should be verifiable. Test on actual device via QR code for full camera functionality."
