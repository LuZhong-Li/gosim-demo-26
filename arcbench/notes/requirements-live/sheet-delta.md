# sheet: live task page vs local snapshot

- live requirements parsed: 41
- local snapshot requirements: 41
- live-only sentences: 638

Only sentences that exist on the live page but not in the local snapshot are listed.

## REQ-1 Workbook Access and Lifecycle

- After a workbook is opened, created, or imported, the editor state shown in the browser must be a stable workbook state: visiting or refreshing that exact workbook state must open the same workbook rather than another workbook or a temporary blank page, and successful workbook modifications must remain available through that visible workbook state.

## REQ-1-1-1 View and Open a Workbook

- The current editor page entry in the browser must be directly accessible and continue to identify the same workbook after refresh; visiting that exact workbook state in the same or a later browser session must restore the workbook’s most recent successful state without requiring navigation through the home page.
- The entry format is implementation-defined. image FILE Type:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow page entry the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow page entry the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged.

## REQ-1-2 Workbook Creation and Naming

- Workbook Creation and Naming Workbook Creation and Naming Supports creating a blank workbook and changing the workbook name; both operations are initiated from visible workbook state points on the home page or editor page.

## REQ-1-2-1 Create a Blank Workbook

- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow sheet1 the requested workflow a1 the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow Sheet1 the requested workflow A1 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged.

## REQ-1-2-2 Rename a Workbook

- REQ-1-1-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged.

## REQ-1-3-1 Import CSV to Create a Workbook

- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow utf-8 csv,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow UTF-8 CSV,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow CSV the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow csv the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow CSV the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow CSV,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow csv,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow CSV,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow CSV,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow csv,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow CSV,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged.

## REQ-1-3-2 Export the Current Worksheet as CSV

- REQ-1-1-1, REQ-1-3-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow Sheet1 the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow sheet1 the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow Sheet1 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, worksheet Sheet1, and cell A1 value Region); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheet Sheet1, cell A1=Region remain persisted; on failure, the original seeded state remains unchanged.

## REQ-2 Worksheets and Table Structure

- Page reference: image FILE Type:

## REQ-2-1-1 Add a Worksheet

- REQ-1-1-1, REQ-2-1-3 -the requested workflow Sheet2,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow sheet2,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow Sheet2,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow SheetN the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow sheetn the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow SheetN the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-2-1-2 Switch Worksheets

- REQ-2-1-1, REQ-5-1-2, REQ-5-2-1 -the requested workflow, the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow, the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-2-1-3 Rename a Worksheet

- REQ-1-1-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-2-1-4 Delete a Worksheet

- REQ-2-1-1, REQ-5-3-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-2-2-1 Insert and Delete Rows

- If a shifted 0-to-100 numeric validation rule rejects an out-of-range value, the page displays "Please enter a number from 0 to 100".
- REQ-1-1-1 -the requested workflow 3 the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow 3 the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow 3 the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow 3 the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow 3 the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow 3 the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-2-2-2 Insert and Delete Columns

- If a shifted 0-to-100 numeric validation rule rejects an out-of-range value, the page displays "Please enter a number from 0 to 100".
- REQ-1-1-1 -the requested workflow B the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow b the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow B the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow B the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow b the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow B the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales with Sheet1 and Sheet2, rows East/1200 and North/800); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, worksheets Sheet1 and Sheet2, rows East/1200 and North/800 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-3-1-1 Edit a Cell Through the Grid or Formula Bar

- REQ-1-1-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -Escape the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and escape the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "Escape the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow, the requested workflow, the requested workflow, the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow, the requested workflow, the requested workflow, the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow, the requested workflow, the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-3-1-2 Paste Two-Dimensional Table Data

- The full paste either updates every cell in the rectangle and persists after refresh, or displays an error while all target cells retain their original values; when a 0-to-100 numeric validation rule rejects the paste, that error is "Please enter a number from 0 to 100".
- Silently dropping only some values is not allowed.
- REQ-3-1-1 -the requested workflow B2 the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow b2 the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow B2 the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow A1 the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow a1 the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow A1 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow C3 the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow c3 the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow C3 the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-3-1-3 Select a Rectangular Cell Range

- REQ-1-1-1 -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-3-2-1 Copy, Cut, and Paste Cell Ranges

- The source range, target range, and affected formulas must either all update and persist after refresh or all remain in their original state; when a target 0-to-100 numeric validation rule rejects the operation, the page displays "Please enter a number from 0 to 100".
- Cells outside these ranges must not change. image FILE Type:
- REQ-3-1-1, REQ-3-1-3 -the requested workflow A1:B2 the requested workflow D1:E2,the requested workflow, the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow a1:b2 the requested workflow d1:e2,the requested workflow, the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow A1:B2 the requested workflow D1:E2,the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow A1:B2 the requested workflow D1:E2,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow a1:b2 the requested workflow d1:e2,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow A1:B2 the requested workflow D1:E2,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-3-2-2 Undo and Redo Recent Operations

- REQ-2-2-1, REQ-2-2-2, REQ-3-1-1, REQ-3-1-2, REQ-3-2-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, range A1:B2 containing Item/Qty and Pen/4, and target range D1:E2); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, range A1:B2, values Item/Qty and Pen/4, target D1:E2 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-4-1-1 Calculate Basic Expressions and Aggregate Functions

- Page reference: image FILE Type:
- REQ-3-1-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow, the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow, the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow, the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-4-1-2 Copy Formulas and Adjust Relative References

- REQ-4-1-1, REQ-3-2-1, REQ-4-2-2 -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-4-2-1 Recalculate Dependent Formulas After Source Data Changes

- REQ-2-2-1, REQ-2-2-2, REQ-3-1-1, REQ-3-1-2, REQ-3-2-1, REQ-4-1-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-4-2-2 Display and Fix Formula Errors

- REQ-4-1-1 -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded workbook Q3 Sales, cells A1=2, B1=3, and formulas =A1+B1 and =C12); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and workbook Q3 Sales, cells A1=2, B1=3, formulas =A1+B1 and =C12 remain persisted; on failure, the original seeded state remains unchanged.

## REQ-5-1-1 Sort a Data Range by a Specified Column

- REQ-3-1-3, REQ-4-2-1, REQ-5-1-2, REQ-5-2-1 -the requested workflow Sales the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow sales the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow Sales the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow ISO the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow iso the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow ISO the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged.

## REQ-5-1-2 Filter Rows by Value or Condition

- REQ-1-3-2, REQ-3-1-3 -the requested workflow Region the requested workflow Sales the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow region the requested workflow sales the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow Region the requested workflow Sales the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow, the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow, the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow, the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -CSV the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and csv the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "CSV the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged.

## REQ-5-2-1 Set Dropdown or Numeric Validation for a Range

- In the persisted multi-cell 0-to-100 boundary scenario, rejecting 101 in B3 displays "Please enter a number from 0 to 100".
- REQ-3-1-1, REQ-3-1-2, REQ-3-1-3, REQ-3-2-1 -the requested workflow A1:A2 the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow a1:a2 the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow A1:A2 the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged.

## REQ-5-3-1 Create and Refresh a Basic Pivot Table

- Create and Refresh a Basic Pivot Table Core Requirements for an Online Spreadsheet Data Workspace A streamlined online spreadsheet application with an interface modeled after Google Sheets, covering workbook and worksheet management, spreadsheet data editing, formula calculation, sorting and filtering, data validation, and basic pivot analysis.
- Sharing and collaboration, version-history restoration, advanced visual styling, charts, macros, real-time collaborative cursors, and integrations with external office suites are outside the core scope.
- If a selected source header has been deleted, clicking refresh displays "Pivot field is no longer available.
- REQ-2-1-1, REQ-2-2-1, REQ-2-2-2, REQ-3-1-3, REQ-5-1-2 -the requested workflow Pivot1 the requested workflow Region the requested workflow Sales,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow pivot1 the requested workflow region the requested workflow sales,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow Pivot1 the requested workflow Region the requested workflow Sales,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow,the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow,the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow,the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow COUNT the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow count the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow COUNT the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -AVERAGE the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and average the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "AVERAGE the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged. -the requested workflow COUNT the requested workflow GIVEN:
- The visitor starts at the application home page in a fresh unauthenticated browser session.
- The evaluation seed contains the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open.
- The user opens the workbook home page, clicks the visible Q3 Sales workbook entry, and the requested workflow count the requested workflow with concrete values East, 1200, North, and 800.
- Every value is entered through a visible, labelled control; no implementation-specific navigation, API, database id, or internal implementation detail is assumed.
- The application exposes the observable result for "the requested workflow COUNT the requested workflow" using the same seeded names and values (the seeded worksheet range A1:C6 with headers Region/Sales/Status and rows East/1200/Open, North/800/Closed, South/700/Open); validation or permission failures are shown beside the named control and do not create a partial record.
- After the user refreshes the page or reopens the visible destination from the application entry point, the successful result and range A1:C6, headers Region/Sales/Status, rows East/1200/Open, North/800/Closed, South/700/Open remain persisted; on failure, the original seeded state remains unchanged.
- Run Run history Latest saved submission Ready to run 2026/9/30 05:32:41 arc-agent-r33 Model deepseek-v4-flash Execution A run is in progress arc-agent-r14-fixed PENDING Open run details Run latest submission Create new submission
