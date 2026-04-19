# Firestore Security Specification - Ramadan Cow Savings Tracker

## Data Invariants
1. **User Integrity**: A user profile must exist and be approved by an admin before they can perform any write operations (other than self-registration).
2. **Relational Constraints**:
   - Every transaction belongs to a group.
   - Access to transactions and members within a group is restricted to members of that group or application admins.
   - A member cannot be removed if they are the group 'owner' (creator), unless by a super_admin.
3. **Identity Protection**:
   - Users can only edit their own basic profile fields (displayName, photoURL).
   - Only admins can change user roles (`appRole`) and approval status (`isApproved`).

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identity Spoofing**: Creating a transaction with `userId` of another member.
2. **State Shortcutting**: Updating `isApproved` to `true` while creating one's own profile.
3. **Privilege Escalation**: Updating one's own `appRole` to `admin`.
4. **Orphaned Writes**: Creating a transaction in a group the user is not a member of.
5. **PII Leak**: A non-approved user reading the email or phone of all users.
6. **Shadow Update**: Adding a `isAdmin: true` field to a user document that doesn't expect it.
7. **Resource Poisoning**: Injecting a 2MB string into a `description` field.
8. **Owner Removal**: A group admin trying to delete the group 'owner' membership record.
9. **Terminal State Lock**: Modifying a transaction after it has been "finalized" (if status existed).
10. **Query Scraping**: Listing all transactions across all groups without being a super_admin.
11. **Negative Amount**: Creating a transaction with a negative amount (unless withdrawal is allowed to be negative).
12. **ID Poisoning**: Using a document ID like `../../secrets` to try and navigate paths.

## Validation Blueprints
- `isValidUser(data)`: Enforces size limits and type safety for user profiles.
- `isValidGroup(data)`: Enforces group structure and member list limits.
- `isValidMember(data)`: Enforces membership record integrity.
- `isValidTransaction(data)`: Enforces transaction amounts and dates.
