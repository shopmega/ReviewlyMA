# Data Model & Mock Data Report

**Overall Assessment:**
The application's data structure, defined primarily in `src/lib/types.ts` and mocked in `src/lib/data.ts`, is well-organized, comprehensive, and scalable. It uses a centralized `Business` entity that can represent two distinct types of establishments ("commerce" and "employer"), which is a highly efficient approach. The use of nested objects and arrays for related data like reviews, salaries, and hours is excellent.

The data model is robust enough to power all the features currently displayed in the UI and provides a solid foundation for future expansion.

---

### 1. Core Entity: `Business`

This is the central data model for the entire application. All other data points (reviews, salaries, etc.) are nested within or related to a `Business` object.

| Property | Type | Description & Notes |
| :--- | :--- | :--- |
| **`id`** | `string` | A unique identifier (slug) for the business, used in URLs (e.g., `/businesses/bimo-cafe`). |
| **`name`** | `string` | The display name of the business. |
| **`logo`** | `ImagePlaceholder` | An object referencing the logo image from `placeholder-images.json`. |
| **`photos`** | `ImagePlaceholder[]`| An array of images for the business's photo gallery. |
| **`category`** | `string` | The primary category (e.g., "Café & Restaurant", "Télécommunications"). |
| **`location`** | `string` | The city or neighborhood where the business is located. |
| **`description`**| `string` | A short text description of the business. |
| **`overallRating`**| `number` | The calculated average rating from all reviews. |
| **`reviews`**| `Review[]` | An array of `Review` objects associated with this business. |
| **`type`** | `'commerce' \| 'employer'` | **Crucial discriminator.** Determines which set of properties and UI components are applicable. |
| **`isFeatured`** | `boolean?` | Optional flag to feature the business on the homepage. |

---

### 2. Business Type: `commerce`

Properties specific to businesses where `type === 'commerce'`.

| Property | Type | Description & Notes |
| :--- | :--- | :--- |
| **`amenities`** | `string[]?` | A list of available amenities (e.g., "Wifi Gratuit", "Terrasse"). |
| **`hours`** | `DayHours[]?` | An array of objects defining the opening hours for each day of the week. |
| **`updates`** | `Update[]?` | An array of `Update` objects for news or promotions. |
| **`priceRange`** | `1 \| 2 \| 3 \| 4?` | A number representing the price level (e.g., € to €€€€). |

---

### 3. Business Type: `employer`

Properties specific to businesses where `type === 'employer'`.

| Property | Type | Description & Notes |
| :--- | :--- | :--- |
| **`website`** | `string?` | The company's official website URL. |
| **`employeeCount`**| `number?` | The approximate number of employees. |
| **`salaries`** | `Salary[]?` | An array of `Salary` objects reported by employees. |
| **`interviews`** | `Interview[]?` | An array of `Interview` objects detailing hiring experiences. |

---

### 4. Sub-Entities

These data models are typically nested within a `Business` object.

#### `Review`
The most detailed sub-entity, used for both commerce and employer reviews.

| Property | Type | Description |
| :--- | :--- | :--- |
| **`id`** | `number` | Unique ID for the review. |
| **`rating`** | `number` | The main star rating (1-5). |
| **`title`** | `string` | The headline of the review. |
| **`text`** | `string` | The detailed body of the review. |
| **`author`** | `string` | The name of the reviewer (mocked for now). |
| **`date`** | `string` | The publication date. |
| **`subRatings`** | `object?` | Optional detailed ratings for specific criteria (e.g., `service`, `workLifeBalance`). The keys differ based on the business `type`. |
| **`likes` / `dislikes`** | `number` | Counts for how helpful the review was. |
| **`ownerReply`** | `object?` | An optional object containing the business owner's response. |

#### `Salary` & `Interview`
These are specific to `employer` type businesses.

-   **`Salary`**: Contains `jobTitle`, `salary` (monthly), `location`, and `date`.
-   **`Interview`**: Contains `jobTitle`, `experience`, `difficulty`, and an array of `questions`.

---

### 5. Image Management (`placeholder-images.json`)

-   **Centralized Image Data:** All placeholder images used in the mock data are defined in `src/lib/placeholder-images.json`.
-   **`ImagePlaceholder` Type:** This provides a consistent structure (`id`, `description`, `imageUrl`, `imageHint`) for all image assets.
-   **`getImage()` Utility:** The `src/lib/data.ts` file uses a helper function to retrieve images by `id` from the JSON file, which is a great practice for maintainability and preventing broken links.

---

### Summary & Recommendations

1.  **Data Integrity:** The current model is excellent. The distinction between `commerce` and `employer` is the most important architectural feature. When building the backend, the database schema should reflect this, perhaps using a single "businesses" table with a `type` column and nullable columns for type-specific data.
2.  **User Data:** The model currently lacks a `User` entity. A `User` model would be needed to connect reviews, salaries, and saved businesses to a specific person. The `author` field in `Review` is currently a simple string and would need to be replaced with a `userId` foreign key.
3.  **Scalability:** For a real-world application, the nested arrays (like `reviews`) should be handled via relational queries rather than being embedded in the `Business` document to support pagination and improve performance (e.g., `getReviewsForBusiness(businessId, page, limit)`).
