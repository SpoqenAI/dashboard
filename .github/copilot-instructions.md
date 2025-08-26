# Phone Number Provisioning Migration Todo List

## Migration Overview

Migrate the existing Next.js-based phone number provisioning system to a pure Supabase Edge Functions architecture using database triggers and programmatic Twilio phone number search.

**Current Status**: Planning Phase  
**Target Architecture**: Database Triggers → Edge Functions → Twilio/VAPI Integration  
**Database Schema**: NO CHANGES REQUIRED - all data retrieved via JOIN queries

---

## 📋 Pre-Migration Analysis (Complete First)

### Current Architecture Documentation

- [ ] **Document Current File Locations**

  - [x] Paddle Webhook Handler: `app/api/webhooks/paddle/route.ts` (preserve for subscription updates)
  - [x] Webhook Processor: `utils/paddle/process-webhook.ts` (contains current business logic)
  - [x] Assistant Actions: `lib/actions/assistant.actions.ts` (contains phone provisioning functions)
  - [x] Existing VAPI Edge Function: `supabase/functions/vapi-assistant-provision/index.ts`

- [ ] **Map Database Schema (No Changes Required)**

  - [ ] `subscriptions` table: tier_type, status, user_id, current
  - [ ] `phone_numbers` table: provider, provider_number_id, e164_number, status, user_id
  - [ ] `user_settings` table: vapi_assistant_id, assistant_provisioning_status
  - [ ] `profiles` table: paddle_customer_id, email, city, state

- [ ] **Analyze Current Business Logic**
  - [ ] Extract subscription tier validation logic from `process-webhook.ts`
  - [ ] Document phone provisioning logic from `assistant.actions.ts`
  - [ ] Map Twilio integration patterns
  - [ ] Document VAPI assistant linking process

---

## 🏗️ Phase 1: Database Infrastructure Setup

### 1.1 Enable Database Extensions

- [ ] **Enable pg_net Extension**
  - [ ] Run CREATE EXTENSION IF NOT EXISTS pg_net in Supabase SQL Editor
  - [ ] Verify extension is enabled by checking pg_extension table
  - [ ] Test HTTP capabilities with net.http_post function

### 1.2 Create Database Trigger Function

- [ ] **Create Trigger Function in supabase/migrations/**
  - [ ] Create PostgreSQL function named trigger_phone_provision that returns TRIGGER
  - [ ] Only trigger for tier changes to paid subscriptions (tier_type != 'free')
  - [ ] Trigger on INSERT or UPDATE when tier type changes
  - [ ] Build JSON payload with user_id, tier_type, subscription_status, trigger_action, timestamp
  - [ ] Make async HTTP call to Edge Function using net.http_post
  - [ ] Set proper headers: Content-Type application/json and Authorization Bearer token
  - [ ] Insert log entry into phone_provision_logs table with user_id, trigger_action, response_id
  - [ ] Return NEW record

### 1.3 Create Database Trigger

- [ ] **Create Subscription Trigger**
  - [ ] Create AFTER INSERT OR UPDATE trigger on subscriptions table
  - [ ] Name trigger: subscription_phone_provision_trigger
  - [ ] Set FOR EACH ROW execution
  - [ ] Execute trigger_phone_provision function
- [ ] **Test Trigger Creation**
  - [ ] Verify trigger exists in pg_trigger table by name
  - [ ] Test with dummy subscription update

### 1.4 Create Logging Table (Optional but Recommended)

- [ ] **Create Phone Provision Logs Table**
  - [ ] Create table named phone_provision_logs
  - [ ] Add BIGSERIAL PRIMARY KEY column: id
  - [ ] Add UUID column: user_id with foreign key to auth.users(id)
  - [ ] Add TEXT column: trigger_action (NOT NULL)
  - [ ] Add BIGINT column: response_id
  - [ ] Add TEXT column: status with default 'pending'
  - [ ] Add TEXT column: error_message
  - [ ] Add TIMESTAMP WITH TIME ZONE columns: created_at and updated_at with NOW() defaults

---

## 🚀 Phase 2: Edge Function Development

### 2.1 Create Main Phone Provisioning Edge Function

- [ ] **Create Function Directory**

  - [ ] Create directory: supabase/functions/phone-number-provision

- [ ] **Implement Core Edge Function** (supabase/functions/phone-number-provision/index.ts)

  - [ ] **Basic Function Structure**
    - [ ] Import createClient from @supabase/supabase-js
    - [ ] Create async handler function that accepts Request and returns Response
    - [ ] Set up Deno.serve with handler function
  - [ ] **Authentication & Validation**
    - [ ] Validate Authorization header contains Service Role Key
    - [ ] Parse and validate request payload JSON
    - [ ] Validate user_id format is proper UUID
  - [ ] **Data Retrieval with Single JOIN Query**
    - [ ] Create SQL query joining profiles, subscriptions, phone_numbers, and user_settings tables
    - [ ] Select profile data: id, paddle_customer_id, email, city, state
    - [ ] Select subscription data: id, tier_type, status, current flag
    - [ ] Select phone number data: id, e164_number, status
    - [ ] Select user settings: vapi_assistant_id, assistant_provisioning_status
    - [ ] Use LEFT JOIN for optional relations, WHERE clause for user_id
  - [ ] **Business Logic Implementation**
    - [ ] Determine if phone provisioning is needed based on subscription tier
    - [ ] Check for existing phone numbers to prevent duplicates
    - [ ] Validate subscription eligibility and status
    - [ ] Handle edge cases: downgrades, cancellations, expired subscriptions

### 2.2 Integrate Twilio Phone Number Search

- [ ] **Implement Twilio Integration**

  - [ ] **Environment Variables Setup**
    - [ ] Configure TWILIO_ACCOUNT_SID environment variable
    - [ ] Configure TWILIO_AUTH_TOKEN environment variable
    - [ ] Configure TWILIO_WEBHOOK_URL environment variable
  - [ ] **Programmatic Phone Search Function**
    - [ ] Create searchAndProvisionPhoneNumber function that accepts userId parameter
    - [ ] Search for ANY available US phone number without location constraints
    - [ ] Implement logic for higher success rates by avoiding location restrictions
    - [ ] Purchase phone number immediately upon finding availability
  - [ ] **Phone Number Purchase Logic**
    - [ ] Search available phone numbers in US with no location constraints
    - [ ] Purchase first available number from search results
    - [ ] Configure webhook URLs for VAPI integration during purchase
    - [ ] Store phone number data in database after successful purchase
  - [ ] **Error Handling & Rollback**
    - [ ] Implement transaction rollback mechanism on any failure
    - [ ] Release purchased numbers if database linking fails
    - [ ] Implement comprehensive error logging for all failure scenarios

### 2.3 Database Transaction Management

- [ ] **Implement Transactional Operations**

  - [ ] Create Supabase RPC call to provision_phone_transaction function
  - [ ] Pass parameters: user_id, phone_number, provider_number_id, tier_type
  - [ ] Handle response data and error cases

- [ ] **Create Database Function for Transactions**
  - [ ] Create PostgreSQL function named provision_phone_transaction
  - [ ] Accept parameters: p_user_id UUID, p_phone_number TEXT, p_provider_number_id TEXT, p_tier_type TEXT
  - [ ] Return JSON result object
  - [ ] Start transaction block with BEGIN/EXCEPTION/END structure
  - [ ] Insert phone number record with user_id, e164_number, provider_number_id, provider='twilio', status='active'
  - [ ] Update user_settings table to set assistant_provisioning_status='phone_provisioned'
  - [ ] Return success JSON with phone_number on success
  - [ ] Return error JSON with SQLERRM on exception (automatic rollback)

---

## 🔗 Phase 3: VAPI Integration Edge Function

### 3.1 Create VAPI Number Update Function

- [ ] **Create Function Directory**

  - [ ] Create directory: supabase/functions/vapi-number-update

- [ ] **Implement VAPI Linking Function** (supabase/functions/vapi-number-update/index.ts)

  - [ ] **Function Structure**
    - [ ] Accept phone number and user data in request payload
    - [ ] Retrieve VAPI assistant ID from user_settings table
    - [ ] Update VAPI assistant with phone number association
    - [ ] Configure webhook URLs and assistant settings
  - [ ] **VAPI API Integration**
    - [ ] Create linkPhoneToVAPIAssistant function accepting assistantId and phoneNumber parameters
    - [ ] Implement VAPI API calls to associate phone with assistant
    - [ ] Configure assistant settings for phone integration
    - [ ] Handle API errors with fallback mechanisms
  - [ ] **Error Handling & Retry Logic**
    - [ ] Implement exponential backoff for API failures
    - [ ] Provide fallback mechanisms for service outages
    - [ ] Comprehensive logging for troubleshooting and debugging

### 3.2 Integrate with Main Provisioning Function

- [ ] **Call VAPI Function from Phone Provisioning**
  - [ ] Make HTTP call to vapi-number-update function
  - [ ] Handle async responses
  - [ ] Implement retry logic for network failures

---

## ⚙️ Phase 4: Environment Configuration

### 4.1 Supabase Edge Function Environment Variables

- [ ] **Configure in Supabase Dashboard**
  - [ ] Set TWILIO_ACCOUNT_SID environment variable
  - [ ] Set TWILIO_AUTH_TOKEN environment variable
  - [ ] Set TWILIO_WEBHOOK_URL environment variable
  - [ ] Set VAPI_API_KEY environment variable
  - [ ] Set VAPI_WEBHOOK_SECRET environment variable
  - [ ] Set SUPABASE_URL environment variable
  - [ ] Set SERVICE_ROLE_KEY environment variable

### 4.2 Security Configuration

- [ ] **Secure API Keys in Supabase Vault**
  - [ ] Store sensitive keys in vault
  - [ ] Reference vault keys in Edge Functions
  - [ ] Implement proper access controls

### 4.3 Webhook URL Configuration

- [ ] **Update Twilio Webhook URLs**
  - [ ] Point to VAPI assistant endpoints
  - [ ] Configure proper authentication
  - [ ] Test webhook delivery

---

## 🧪 Phase 5: Testing & Validation

### 5.1 Unit Testing

- [ ] **Test Database Trigger**

  - [ ] Create test subscription with tier change
  - [ ] Verify trigger fires correctly
  - [ ] Check HTTP call to Edge Function
  - [ ] Validate payload structure

- [ ] **Test Edge Function Components**
  - [ ] Test authentication/authorization
  - [ ] Test data retrieval JOIN query
  - [ ] Test business logic decisions
  - [ ] Test Twilio integration
  - [ ] Test VAPI integration
  - [ ] Test error handling scenarios

### 5.2 Integration Testing

- [ ] **End-to-End Flow Testing**

  - [ ] Create test user with free subscription
  - [ ] Upgrade to paid subscription
  - [ ] Verify phone number provisioning
  - [ ] Confirm VAPI assistant linking
  - [ ] Test downgrade scenarios

- [ ] **Error Scenario Testing**
  - [ ] Test Twilio API failures
  - [ ] Test VAPI API failures
  - [ ] Test network timeouts
  - [ ] Test database transaction rollbacks
  - [ ] Test duplicate phone number prevention

### 5.3 Load Testing

- [ ] **Performance Validation**
  - [ ] Test concurrent provisioning requests
  - [ ] Measure response times
  - [ ] Verify system stability under load
  - [ ] Test rate limiting behavior

### 5.4 Idempotency Testing

- [ ] **Prevent Duplicate Operations**
  - [ ] Test duplicate trigger calls
  - [ ] Verify phone number uniqueness constraints
  - [ ] Test retry scenarios
  - [ ] Validate cleanup mechanisms

---

## 🚀 Phase 6: Migration Implementation

### 6.1 Deployment Sequence

- [ ] **Step 1: Deploy Edge Functions**

  - [ ] Deploy phone-number-provision function using supabase functions deploy
  - [ ] Deploy vapi-number-update function using supabase functions deploy

- [ ] **Step 2: Deploy Database Changes**

  - [ ] Push database migrations using supabase db push

- [ ] **Step 3: Create Database Trigger**

  - [ ] Run trigger creation SQL statements
  - [ ] Verify trigger is active in database
  - [ ] Test with non-production data

- [ ] **Step 4: Update Environment Variables**
  - [ ] Configure all required environment variables in Supabase dashboard
  - [ ] Test Edge Function access to variables
  - [ ] Verify security configurations are working

### 6.2 Gradual Rollout Strategy

- [ ] **Phase 6.2.1: Internal Testing**

  - [ ] Test with internal accounts only
  - [ ] Monitor logs and performance
  - [ ] Validate complete functionality

- [ ] **Phase 6.2.2: Limited Production Rollout**

  - [ ] Enable for small subset of users
  - [ ] Monitor success rates
  - [ ] Track error frequencies
  - [ ] Collect performance metrics

- [ ] **Phase 6.2.3: Full Production Rollout**
  - [ ] Enable for all users
  - [ ] Monitor system stability
  - [ ] Track provisioning success rates
  - [ ] Monitor resource usage

### 6.3 Rollback Plan

- [ ] **Prepare Rollback Procedures**
  - [ ] Document trigger disable process
  - [ ] Prepare Edge Function disable commands
  - [ ] Plan fallback to original system
  - [ ] Test rollback procedures in staging

---

## 📊 Phase 7: Monitoring & Observability

### 7.1 Logging Implementation

- [ ] **Comprehensive Logging Strategy**
  - [ ] Log all phone number search attempts
  - [ ] Track Twilio API response times
  - [ ] Monitor success/failure rates
  - [ ] Log database operation performance
  - [ ] Track VAPI integration success rates

### 7.2 Performance Monitoring

- [ ] **Key Metrics to Track**
  - [ ] End-to-end provisioning time
  - [ ] Phone number search success rate
  - [ ] Twilio API error rates
  - [ ] VAPI integration success rate
  - [ ] Database query performance
  - [ ] Edge Function execution time

### 7.3 Alerting Setup

- [ ] **Critical Failure Alerts**
  - [ ] Phone provisioning failures > 5%
  - [ ] Twilio API errors > 10%
  - [ ] Database connection failures
  - [ ] VAPI integration failures > 5%
  - [ ] Edge Function timeout errors

### 7.4 Dashboard Creation

- [ ] **Monitoring Dashboard**
  - [ ] Real-time provisioning metrics
  - [ ] Error rate trends
  - [ ] Performance graphs
  - [ ] Resource utilization charts

---

## 📋 Phase 8: Business Rules Validation

### 8.1 Subscription Rules

- [ ] **Validate Existing Business Logic**
  - [ ] Only paid subscribers get phone numbers
  - [ ] One phone number per user constraint
  - [ ] Pause numbers on downgrade to free
  - [ ] Release numbers on cancellation
  - [ ] Maintain complete audit trail

### 8.2 Data Integrity

- [ ] **Ensure Data Consistency**
  - [ ] Validate foreign key relationships
  - [ ] Test unique constraints
  - [ ] Verify cascade deletion rules
  - [ ] Test data migration edge cases

### 8.3 Security Validation

- [ ] **Security Best Practices**
  - [ ] Validate input sanitization
  - [ ] Test authentication mechanisms
  - [ ] Verify API key security
  - [ ] Test access controls

---

## 🔄 Phase 9: Documentation & Handoff

### 9.1 Technical Documentation

- [ ] **Create Comprehensive Documentation**
  - [ ] System architecture diagrams
  - [ ] Database schema documentation
  - [ ] API endpoint documentation
  - [ ] Environment variable guide
  - [ ] Troubleshooting guide

### 9.2 Operational Documentation

- [ ] **Operations Manual**
  - [ ] Monitoring procedures
  - [ ] Alert response procedures
  - [ ] Rollback procedures
  - [ ] Scaling guidelines
  - [ ] Backup and recovery procedures

### 9.3 Development Documentation

- [ ] **Developer Guide**
  - [ ] Local development setup
  - [ ] Testing procedures
  - [ ] Deployment process
  - [ ] Code review guidelines
  - [ ] Contributing guidelines

---

## ✅ Phase 10: Post-Migration Validation

### 10.1 System Validation

- [ ] **Validate Complete System**
  - [ ] All phone provisioning working correctly
  - [ ] VAPI integration functioning properly
  - [ ] Error handling working as expected
  - [ ] Performance meeting requirements
  - [ ] Monitoring systems operational

### 10.2 User Experience Validation

- [ ] **User Journey Testing**
  - [ ] Test subscription upgrade flow
  - [ ] Validate phone number assignment
  - [ ] Test assistant functionality
  - [ ] Verify user notifications

### 10.3 Business Process Validation

- [ ] **Business Requirements Met**
  - [ ] All business rules implemented correctly
  - [ ] Billing integration working properly
  - [ ] Customer support processes updated
  - [ ] Analytics and reporting functional

---

## 🎯 Success Criteria

### Primary Goals

- [ ] **100% Migration Completion**
  - [ ] All phone provisioning moved to Edge Functions
  - [ ] Original Next.js system safely deprecated
  - [ ] Database triggers functioning correctly
  - [ ] All business logic preserved

### Performance Goals

- [ ] **Performance Improvements**
  - [ ] Faster phone number provisioning (< 30 seconds)
  - [ ] Higher success rates (> 95%)
  - [ ] Improved system reliability
  - [ ] Better error handling and recovery

### Operational Goals

- [ ] **Operational Excellence**
  - [ ] Complete monitoring and alerting
  - [ ] Comprehensive documentation
  - [ ] Smooth operations handoff
  - [ ] Zero critical production issues

---

## 📝 Notes & Important Considerations

### Migration Notes

- **Database Schema**: NO changes required - all data retrieved via JOIN queries
- **Paddle Webhook**: Preserve existing functionality during migration
- **Gradual Rollout**: Plan for ability to rollback if issues arise
- **Documentation**: All configuration changes and environment variables documented

### Performance Optimization

- **Database Queries**: Optimize JOIN queries for minimal response time
- **Connection Pooling**: Implement proper resource management
- **API Timeouts**: Use appropriate timeout values for external calls
- **Caching**: Cache frequently accessed configuration data

### Security Requirements

- **API Key Security**: All keys secured in Supabase vault
- **Authentication**: Proper authentication for Edge Function endpoints
- **Input Validation**: All input data validated and sanitized
- **Security Best Practices**: Follow security guidelines for external API integrations

---

**Migration Status**: ⏳ **In Progress**  
**Next Action**: Complete Phase 1 - Database Infrastructure Setup  
**Assigned To**: Development Team  
**Review Date**: _To be scheduled_

---

_This todo list should be updated as tasks are completed and new requirements are discovered during the migration process._
