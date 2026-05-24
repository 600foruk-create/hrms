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
  `role` enum('Admin','Manager','Employee') NOT NULL DEFAULT 'Employee',
  `managerId` varchar(50) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `users`
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `managerId`, `status`) VALUES
('U1', 'admin@hrms.com', 'admin123', 'Syed Admin', 'Admin', '', 'Active'),
('U2', 'sarah.manager@hrms.com', 'manager123', 'Sarah Jenkins', 'Manager', '', 'Active'),
('U3', 'alex.manager@hrms.com', 'manager123', 'Alex Mercer', 'Manager', '', 'Active'),
('U4', 'john.emp@hrms.com', 'employee123', 'John Doe', 'Employee', 'U2', 'Active'),
('U5', 'emma.emp@hrms.com', 'employee123', 'Emma Watson', 'Employee', 'U2', 'Active'),
('U6', 'ryan.emp@hrms.com', 'employee123', 'Ryan Gosling', 'Employee', 'U3', 'Active');

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

-- Table structure for table `productivity`
CREATE TABLE `productivity` (
  `id` varchar(50) NOT NULL,
  `employeeId` varchar(50) NOT NULL,
  `employeeName` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `tasks` json NOT NULL,
  `subcategories` json NOT NULL,
  `counts` json NOT NULL,
  `notes` text NOT NULL,
  `score` decimal(10,2) NOT NULL,
  `status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
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
ALTER TABLE `productivity` ADD PRIMARY KEY (`id`);
ALTER TABLE `announcements` ADD PRIMARY KEY (`id`);
ALTER TABLE `notifications` ADD PRIMARY KEY (`id`);

COMMIT;
