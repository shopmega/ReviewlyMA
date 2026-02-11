-- Analytics and Monitoring Schema for Avis Platform (FIXED VERSION)
-- This file creates tables for advanced analytics and monitoring

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event TEXT NOT NULL CHECK (event IN (
        'page_view', 'business_view', 'search_performed', 'review_submitted',
        'business_claimed', 'user_registered', 'premium_subscribed',
        'widget_embedded', 'contact_form_submitted', 'filter_applied',
        'business_saved'
    )),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    properties JSONB DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lcp FLOAT, -- Largest Contentful Paint
    fid FLOAT, -- First Input Delay
    cls FLOAT, -- Cumulative Layout Shift
    fcp FLOAT, -- First Contentful Paint
    ttfb FLOAT, -- Time to First Byte
    page_load_time FLOAT,
    dom_content_loaded FLOAT,
    resource_load_time FLOAT,
    api_response_time FLOAT,
    interaction_delay FLOAT,
    scroll_performance FLOAT,
    memory_usage BIGINT,
    page TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    connection_type TEXT,
    device_type TEXT,
    session_id TEXT
);

-- Error Reports Table
CREATE TABLE IF NOT EXISTS error_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'javascript', 'network', 'api', 'react', 'unhandled_rejection'
    )),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    url TEXT NOT NULL,
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    occurrences INTEGER DEFAULT 1,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Real-time Metrics Table
CREATE TABLE IF NOT EXISTS real_time_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    active_users INTEGER NOT NULL DEFAULT 0,
    current_page_views INTEGER NOT NULL DEFAULT 0,
    server_load FLOAT NOT NULL DEFAULT 0,
    response_time FLOAT NOT NULL DEFAULT 0,
    error_rate FLOAT NOT NULL DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Keep only last 1000 records automatically
    CONSTRAINT real_time_metrics_timestamp_check CHECK (timestamp > NOW() - INTERVAL '7 days')
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'error_rate', 'response_time', 'server_load', 'user_activity'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_views INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location_country TEXT,
    location_city TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Business Analytics Table
CREATE TABLE IF NOT EXISTS business_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    calls INTEGER DEFAULT 0,
    directions INTEGER DEFAULT 0,
    website_clicks INTEGER DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    avg_rating FLOAT,
    response_time FLOAT,
    conversion_rate FLOAT,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_id, date, updated_at)
);

-- User Funnel Table
CREATE TABLE IF NOT EXISTS user_funnel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    step TEXT NOT NULL CHECK (step IN (
        'landing_page', 'search', 'business_view', 'review_start',
        'review_submit', 'registration_start', 'registration_complete',
        'premium_view', 'premium_subscribe'
    )),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    properties JSONB DEFAULT '{}',
    completed BOOLEAN DEFAULT TRUE,
    time_to_complete_seconds INTEGER
);

-- A/B Testing Table
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    variants JSONB NOT NULL DEFAULT '[]',
    traffic_split JSONB NOT NULL DEFAULT '{}',
    target_audience JSONB DEFAULT '{}',
    success_metrics JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id)
);

-- A/B Test Results Table
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    variant TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2) DEFAULT 0,
    properties JSONB DEFAULT '{}'
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_business_id ON analytics_events(business_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page ON performance_metrics(page);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp ON error_reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON error_reports(severity);
CREATE INDEX IF NOT EXISTS idx_error_reports_resolved ON error_reports(resolved);
CREATE INDEX IF NOT EXISTS idx_error_reports_type ON error_reports(type);

CREATE INDEX IF NOT EXISTS idx_real_time_metrics_timestamp ON real_time_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON monitoring_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_business_analytics_business_date ON business_analytics(business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_business_analytics_date ON business_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_user_funnel_user_id ON user_funnel(user_id);
CREATE INDEX IF NOT EXISTS idx_user_funnel_session_id ON user_funnel(session_id);
CREATE INDEX IF NOT EXISTS idx_user_funnel_step ON user_funnel(step);
CREATE INDEX IF NOT EXISTS idx_user_funnel_timestamp ON user_funnel(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant ON ab_test_results(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_converted ON ab_test_results(converted);

-- Row Level Security (RLS) Policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Analytics Events
CREATE POLICY "Users can view their own analytics events" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert analytics events" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update analytics events" ON analytics_events
    FOR UPDATE USING (true);

-- RLS Policies for Performance Metrics
CREATE POLICY "Service role can manage performance metrics" ON performance_metrics
    FOR ALL USING (true);

-- RLS Policies for Error Reports
CREATE POLICY "Users can view their own error reports" ON error_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage error reports" ON error_reports
    FOR ALL USING (true);

-- RLS Policies for Monitoring Alerts
CREATE POLICY "Admins can view all alerts" ON monitoring_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Service role can manage alerts" ON monitoring_alerts
    FOR ALL USING (true);

-- RLS Policies for User Sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user sessions" ON user_sessions
    FOR ALL USING (true);

-- RLS Policies for Business Analytics
CREATE POLICY "Business owners can view their analytics" ON business_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses b
            JOIN business_claims bc ON b.id = bc.business_id
            WHERE bc.user_id = auth.uid() 
            AND bc.status = 'approved'
            AND b.id = business_analytics.business_id
        )
    );

CREATE POLICY "Admins can view all business analytics" ON business_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Service role can manage business analytics" ON business_analytics
    FOR ALL USING (true);

-- RLS Policies for User Funnel
CREATE POLICY "Service role can manage user funnel" ON user_funnel
    FOR ALL USING (true);

-- RLS Policies for A/B Tests
CREATE POLICY "Admins can manage A/B tests" ON ab_tests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Service role can manage A/B tests" ON ab_tests
    FOR ALL USING (true);

-- RLS Policies for A/B Test Results
CREATE POLICY "Service role can manage A/B test results" ON ab_test_results
    FOR ALL USING (true);

-- Functions for Analytics
CREATE OR REPLACE FUNCTION update_business_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO business_analytics (business_id, "date", views)
    VALUES (NEW.business_id, CURRENT_DATE, 1)
    ON CONFLICT (business_id, "date")
    DO UPDATE SET 
        views = business_analytics.views + 1,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic business analytics updates
CREATE TRIGGER update_business_analytics_trigger
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    WHEN (NEW.event = 'business_view')
    EXECUTE FUNCTION update_business_analytics();

-- Function to clean up old real-time metrics
CREATE OR REPLACE FUNCTION cleanup_old_real_time_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM real_time_metrics 
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old user sessions
CREATE OR REPLACE FUNCTION cleanup_old_user_sessions()
RETURNS void AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE, ended_at = NOW()
    WHERE is_active = TRUE 
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup jobs (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-analytics', '0 2 * * * *', 'SELECT cleanup_old_real_time_metrics();');
-- SELECT cron.schedule('cleanup-sessions', '*/15 * * * * *', 'SELECT cleanup_old_user_sessions();');

-- Grant permissions to service role
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON performance_metrics TO service_role;
GRANT ALL ON error_reports TO service_role;
GRANT ALL ON monitoring_alerts TO service_role;
GRANT ALL ON user_sessions TO service_role;
GRANT ALL ON business_analytics TO service_role;
GRANT ALL ON user_funnel TO service_role;
GRANT ALL ON ab_tests TO service_role;
GRANT ALL ON ab_test_results TO service_role;

-- Grant select permissions to authenticated users for their data
GRANT SELECT ON analytics_events TO authenticated;
GRANT SELECT ON error_reports TO authenticated;
GRANT SELECT ON user_sessions TO authenticated;
GRANT SELECT ON business_analytics TO authenticated;

-- Grant select permissions to admins for admin data
GRANT SELECT ON monitoring_alerts TO authenticated;
GRANT ALL ON ab_tests TO authenticated;
GRANT SELECT ON ab_test_results TO authenticated;
