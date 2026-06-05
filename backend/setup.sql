-- HRMS System SQL Setup Script
-- Hostinger Database Initialization

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------

-- Table structure for table `users`
CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` enum('Admin','Manager','User') NOT NULL DEFAULT 'User',
  `managerId` varchar(50) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `salary` decimal(10,2) NOT NULL DEFAULT '0.00',
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `profilePic` longtext DEFAULT NULL,
  `documents` longtext DEFAULT NULL,
  `bloodGroup` varchar(10) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `users`
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `managerId`, `status`, `salary`, `startDate`) VALUES
('U1', 'admin@hrms.com', 'admin123', 'Syed Admin', 'Admin', '', 'Active', 100000.00, '2020-01-01'),
('U2', 'sarah.manager@hrms.com', 'manager123', 'Sarah Jenkins', 'Manager', '', 'Active', 75000.00, '2021-03-15'),
('U3', 'alex.manager@hrms.com', 'manager123', 'Alex Mercer', 'Manager', '', 'Active', 72000.00, '2021-06-20'),
('U4', 'john.emp@hrms.com', 'employee123', 'John Doe', 'User', 'U2', 'Active', 50000.00, '2022-01-10'),
('U5', 'emma.emp@hrms.com', 'employee123', 'Emma Watson', 'User', 'U2', 'Active', 48000.00, '2022-02-15'),
('U6', 'ryan.emp@hrms.com', 'employee123', 'Ryan Gosling', 'User', 'U3', 'Active', 49000.00, '2022-04-01');

-- --------------------------------------------------------

-- Table structure for table `settings` (Task Weights)
CREATE TABLE `settings` (
  `key_name` varchar(50) NOT NULL,
  `value_data` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `settings`
INSERT INTO `settings` (`key_name`, `value_data`) VALUES
('Billing', 2.00),
('Follow-up', 1.00),
('Payment Posting', 1.50),
('Eligibility Check', 1.00),
('Report Preparation', 2.00);

-- --------------------------------------------------------

-- Table structure for table `leaves`
CREATE TABLE `leaves` (
  `id` varchar(50) NOT NULL,
  `employeeId` varchar(50) NOT NULL,
  `employeeName` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `reason` text NOT NULL,
  `status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `comments` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `practices`
CREATE TABLE `practices` (
  `id` varchar(50) NOT NULL,
  `practice_name` varchar(150) NOT NULL,
  `practice_code` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `manager_practices`
CREATE TABLE `manager_practices` (
  `id` varchar(50) NOT NULL,
  `manager_id` varchar(50) NOT NULL,
  `practice_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `productivity_logs`
CREATE TABLE `productivity_logs` (
  `id` varchar(50) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `practice_id` varchar(50) NOT NULL,
  `log_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `productivity_tasks`
CREATE TABLE `productivity_tasks` (
  `id` varchar(50) NOT NULL,
  `log_id` varchar(50) NOT NULL,
  `task_type` varchar(100) NOT NULL,
  `total_count` int(11) NOT NULL DEFAULT '0',
  `time_minutes` int(11) NOT NULL DEFAULT '0',
  `extra_data` json DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('Pending','Approved','Flagged') NOT NULL DEFAULT 'Pending',
  `comments` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `attendance`
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `employeeId` varchar(50) NOT NULL,
  `employeeName` varchar(100) NOT NULL,
  `status` enum('Present','Absent','Leave') NOT NULL,
  `markedBy` varchar(100) DEFAULT 'System',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `announcements`
CREATE TABLE `announcements` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `target` enum('All','Manager','Employee') NOT NULL DEFAULT 'All',
  `date` date NOT NULL,
  `author` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `audit_logs`
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `userId` varchar(50) NOT NULL,
  `userName` varchar(100) NOT NULL,
  `details` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `notifications`
CREATE TABLE `notifications` (
  `id` varchar(50) NOT NULL,
  `userId` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `read_status` tinyint(1) NOT NULL DEFAULT 0,
  `time` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Table structure for table `company_profile`
CREATE TABLE `company_profile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `reg` varchar(100) DEFAULT NULL,
  `slogan` varchar(255) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `logoBase64` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

-- Indexes
ALTER TABLE `users` ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `email` (`email`);
ALTER TABLE `settings` ADD PRIMARY KEY (`key_name`);
ALTER TABLE `leaves` ADD PRIMARY KEY (`id`);
ALTER TABLE `practices` ADD PRIMARY KEY (`id`);
ALTER TABLE `manager_practices` ADD PRIMARY KEY (`id`);
ALTER TABLE `productivity_logs` ADD PRIMARY KEY (`id`);
ALTER TABLE `productivity_tasks` ADD PRIMARY KEY (`id`);
ALTER TABLE `announcements` ADD PRIMARY KEY (`id`);
ALTER TABLE `notifications` ADD PRIMARY KEY (`id`);

COMMIT;
